# Contributing to Helm

Thanks for considering it. Helm is a small, personal-use-first project that's being open-sourced,
so expect a lighter process than a big OSS project, but the basics still apply.

## Before you start

For anything beyond a small fix, open an issue first describing what you want to change and why.
That avoids spending time on a PR that doesn't fit the project's direction (see the roadmap in
[README.md](README.md)).

## Project layout

```
apps/hub/          Next.js app: UI, API routes, health checker, backups, alerts, encrypted store
apps/collector/     Node script that runs on each monitored server under PM2
scripts/            One-off CLI scripts (e.g. decrypting a backup)
```

See the README for what each piece does.

## Setup

Requires Node.js 22+ (see `.nvmrc`).

```bash
npm install
cp .env.example apps/hub/.env.local   # fill in at least HELM_PASSWORD, HELM_SESSION_SECRET, HELM_ENCRYPTION_KEY
npm run dev                           # http://localhost:3100
```

## Before opening a PR

```bash
npm run build          # must succeed
npm run lint -w @helm/hub
```

There is no automated test suite yet — that's a real gap, and a good first contribution if you
want one. Until then, say in the PR description how you tested the change (what you ran, what you
clicked through).

## Code style

- TypeScript, `strict` mode on. 2-space indentation — see `.editorconfig`.
- Shared data shapes (`Project`, `Client`, `Alert`, `BackupRun`, …) live in `apps/hub/lib/types.ts`. Add to it rather than inlining a new shape.
- Server components by default; add `'use client'` only where you actually need interactivity.
- Comments explain *why*, not *what* — the code should already say what it does.
- Keep secrets out of logs and error messages (see the redaction pattern in `apps/hub/lib/backup.js`
  if you're touching anything that handles a connection string or key).

## Commit messages

Short, imperative, present tense (`Add SSL alert threshold`, not `Added` or `Adding`). No required
format beyond that.

## Reporting bugs

Open an issue with: what you expected, what happened instead, and the hub's logs around the time
it happened (redact any connection strings, tokens or keys first).

## Security issues

Don't open a public issue. See [SECURITY.md](SECURITY.md).
