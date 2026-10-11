#!/usr/bin/env node
// Helm collector. Runs on each server under PM2.
// Every HELM_INTERVAL_SEC it sends PM2 process state and new error lines from the log files to the hub.
//
// Built with `npm run build:collector` into dist/index.js, which is the single plain-JS
// file you copy to the server — the server itself needs no TypeScript toolchain.
//
//   HELM_HUB_URL=https://helm.example.com HELM_COLLECTOR_TOKEN=hlm_... \
//   HELM_LOG_FILES=/var/www/app/logs/error.log node dist/index.js

import { execFile } from 'node:child_process';
import fs from 'node:fs';

interface Pm2Entry {
  name: string;
  status: string;
  restarts: number;
  uptimeMs: number;
}

interface ErrorLine {
  file: string;
  line: string;
}

interface Pm2ListItem {
  name?: string;
  pm2_env?: { status?: string; restart_time?: number; pm_uptime?: number };
}

const HUB = (process.env.HELM_HUB_URL || '').replace(/\/$/, '');
const TOKEN = process.env.HELM_COLLECTOR_TOKEN || '';
const INTERVAL_MS = Number(process.env.HELM_INTERVAL_SEC || 30) * 1000;
const LOG_FILES = (process.env.HELM_LOG_FILES || '').split(',').map((s) => s.trim()).filter(Boolean);
const ERROR_PATTERN = /error|fatal|exception/i;

if (!HUB || !TOKEN) {
  console.error('Set HELM_HUB_URL and HELM_COLLECTOR_TOKEN.');
  process.exit(1);
}

// Lines already sent, so each push only carries new errors. Bounded to keep memory small.
const sent = new Set<string>();
const SENT_LIMIT = 5000;

function pm2List(): Promise<Pm2Entry[]> {
  return new Promise((resolve) => {
    execFile('pm2', ['jlist'], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve([]);
      try {
        const items: Pm2ListItem[] = JSON.parse(stdout);
        resolve(
          items.map((p) => ({
            name: p.name || '',
            status: p.pm2_env?.status || 'unknown',
            restarts: p.pm2_env?.restart_time ?? 0,
            uptimeMs: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
          })),
        );
      } catch {
        resolve([]);
      }
    });
  });
}

function newErrors(): ErrorLine[] {
  const out: ErrorLine[] = [];
  for (const file of LOG_FILES) {
    let lines: string[];
    try {
      lines = fs.readFileSync(file, 'utf8').split('\n').slice(-300);
    } catch {
      continue;
    }
    for (const line of lines) {
      if (!ERROR_PATTERN.test(line)) continue;
      const key = `${file}|${line}`;
      if (sent.has(key)) continue;
      sent.add(key);
      out.push({ file, line: line.slice(0, 500) });
    }
  }
  if (sent.size > SENT_LIMIT) {
    sent.clear();
  }
  return out.slice(-50);
}

async function push(): Promise<void> {
  const body = { pm2: await pm2List(), errors: newErrors() };
  try {
    const res = await fetch(`${HUB}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error(`[helm] ingest rejected: ${res.status}`);
  } catch (err) {
    console.error(`[helm] ingest failed: ${err instanceof Error ? err.message : err}`);
  }
}

push();
setInterval(push, INTERVAL_MS);
