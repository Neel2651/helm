// PM2 process configuration for the Helm hub.
//
// Deploy flow on the server:
//   npm install
//   npm run build
//   pm2 startOrReload ecosystem.config.js --env production
//
// Runtime secrets (HELM_PASSWORD, HELM_SESSION_SECRET, HELM_ENCRYPTION_KEY,
// HELM_GOOGLE_*, HELM_TELEGRAM_*) are read from apps/hub/.env.local by Next.js
// itself — keep them out of this file and out of version control.
//
// This is a monorepo: `next` lives in the ROOT node_modules (npm workspaces
// hoist it), so PM2 runs from the repo root and passes apps/hub as the
// project directory, rather than trying to `cd` into apps/hub first.
//
// The collector (apps/collector/index.js) is NOT started here — it runs on
// each monitored server, not on the hub. See README.md.

const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'helm-hub',
      script: 'node_modules/next/dist/bin/next',
      args: 'start apps/hub -p 3100',
      cwd: __dirname,

      // `next start` is single-process; fork mode with one instance is correct.
      exec_mode: 'fork',
      instances: 1,

      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '512M',

      env: {
        NODE_ENV: 'production',
      },

      // Logs (pm2 logs helm-hub)
      time: true,
      merge_logs: true,
      error_file: path.join(__dirname, 'logs/pm2-error.log'),
      out_file: path.join(__dirname, 'logs/pm2-out.log'),
    },
  ],
};
