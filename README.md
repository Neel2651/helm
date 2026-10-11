# Helm

One private dashboard to monitor, back up and configure every project. [MIT licensed](LICENSE).

> **Status:** early-stage personal project being open-sourced. It works and is in daily use by its
> author, but there's no automated test suite yet (see [CONTRIBUTING.md](CONTRIBUTING.md)) and the
> data store is a JSON file meant for one operator, not a team. Read [SECURITY.md](SECURITY.md)
> before exposing it to anything but `localhost`.

- **Overview:** status of every project (frontend, backend, health endpoints), PM2 state and recent errors.
- **Projects:** per-project settings. Secrets are encrypted at rest and shown masked.
- **Clients:** who each project is for, with contact details and notes.
- **Backups:** scheduled, encrypted database dumps uploaded to Google Drive.
- **Alerts:** Telegram messages for outages, PM2 errors, failed backups, and expiring TLS certificates.
- **Collector:** a small script on each server that sends PM2 state and error log lines to Helm.

The AI actions are planned but not built yet.

## Setup

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example apps/hub/.env.local   # then fill in the values
npm run dev                           # http://localhost:3100
```

Generate the two secrets:

```bash
openssl rand -base64 32   # HELM_SESSION_SECRET
openssl rand -base64 32   # HELM_ENCRYPTION_KEY (keep a copy: stored secrets are unreadable without it)
```

## Install it as an app

Helm is a PWA. Once you've signed in, use the browser's **Install app** / **Add to Home Screen**
option (Chrome: the install icon in the address bar; Safari on iOS: Share → Add to Home Screen).
It then opens full-screen, without the browser's address bar, and gets its own home-screen icon.

There's no offline mode — a monitoring dashboard showing stale data would be worse than useless —
so the service worker behind this only exists to satisfy the browser's install requirement; it
passes every request straight to the network (see `apps/hub/public/sw.js`). The icon itself is
generated from code (`apps/hub/app/icon.js`, `apple-icon.js`, `icons/[size]/route.js`), not a
checked-in image file.

## Add a project

1. Sign in, then **Projects → New project**.
2. Fill in URLs and health endpoints. Checks start on the next cycle (default every 60s).
3. On the project page, **Generate or rotate token**. Copy it now; it is shown once.

## Backups to Google Drive

Each scheduled run dumps the database (`mongodump` for MongoDB, `pg_dump` for Postgres), zips it, encrypts it with `HELM_ENCRYPTION_KEY`, uploads it to the project's Drive folder, checks the upload's MD5 against the local file, then deletes backups beyond the retention count.

The hub machine needs `zip`, plus `mongodump` or `pg_dump` for the databases you back up.

**Google setup (once):**

1. In Google Cloud Console, create a project and enable the **Google Drive API**.
2. Set the OAuth consent screen to **In production**. A consent screen left in "Testing" makes the refresh token expire after 7 days.
3. Create an OAuth client of type **Web application** with the authorised redirect URI `https://developers.google.com/oauthplayground`. (A Desktop app client cannot use that redirect URI.)
4. Use the [OAuth Playground](https://developers.google.com/oauthplayground): gear icon → tick "Use your own OAuth credentials" and enter the client ID and secret. Authorise the scope `https://www.googleapis.com/auth/drive.file`, then exchange the code for tokens and copy the **refresh token**.
5. Put the three values in the hub's `.env.local` as `HELM_GOOGLE_CLIENT_ID`, `HELM_GOOGLE_CLIENT_SECRET` and `HELM_GOOGLE_REFRESH_TOKEN`.

Turn backups on per project (Edit settings → Backups), or press **Run backup now** on the project or Backups page.

**Restore:**

```bash
HELM_ENCRYPTION_KEY=... npm run backup:decrypt -- helm-backup.zip.enc out.zip
unzip out.zip
mongorestore --uri "$URI" --gzip --archive=<file>      # MongoDB
pg_restore --clean --dbname "$URL" <file>              # Postgres
```

Backups run on the hub machine, so they stop when the hub is down. Moving them to a scheduled GitHub Action is planned.

## Alerts on Telegram

Helm sends a message when:

- a project's health endpoint fails 3 times in a row (**down**), or responds slowly or with an unexpected status (**degraded**)
- a PM2 process is `errored`, or restarts 5 or more times between two collector pushes
- a backup fails
- a TLS certificate on a frontend, backend or health endpoint URL has under 14 days left (checked about once a day)
- a project's database does not accept a connection (a TCP-level check; it does not verify the login or run a query)

Each incident sends one message when it starts and one "back up" message when it clears. Repeats are not sent.

**Setup (once):**

1. In Telegram, message **@BotFather**, send `/newbot`, and copy the bot token.
2. Open a chat with your new bot and send it any message (e.g. `hi`).
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser. Find `"chat":{"id": ...}` and copy that number.
4. Put both in `apps/hub/.env.local` as `HELM_TELEGRAM_BOT_TOKEN` and `HELM_TELEGRAM_CHAT_ID`, then restart the hub.
5. Open **Alerts** and press **Send test message**.

Not yet alerted on: domain expiry (there's no registrar integration for this yet).

## Clients

Add a client under **Clients → New client**, then set it on a project from the project's **Edit settings → General** tab. A client can't be deleted while a project is still linked to it; unlink the project first (set its Client back to "No client").

## Deploy

Same pattern as the other PM2-based projects in this account: build once, run under PM2, put
Nginx in front for TLS.

```bash
npm install
npm run build
pm2 startOrReload ecosystem.config.js --env production
```

`ecosystem.config.js` runs `next start` on port 3100, in fork mode (Next is single-process, so
don't switch this to PM2 cluster mode). Logs go to `logs/pm2-error.log` and `logs/pm2-out.log`
(`pm2 logs helm-hub` tails them live). It reads `apps/hub/.env.local` for every secret — nothing
is hardcoded in the PM2 config.

Put Nginx in front of it: copy [`deploy/nginx.conf.example`](deploy/nginx.conf.example), set your
real hostname, and get a certificate (`certbot --nginx -d your-host`). Helm should never be
reachable directly on port 3100 from outside the server.

## Install the collector on a server

The collector is written in TypeScript but ships as a single plain JavaScript file, so the
server it runs on needs nothing beyond Node.js and PM2 — no TypeScript toolchain.

```bash
npm run build:collector                        # compiles apps/collector/index.ts -> dist/index.js
scp apps/collector/dist/index.js your-server:/opt/helm-collector/index.js
```

Then on that server:

```bash
HELM_HUB_URL=https://helm.example.com \
HELM_COLLECTOR_TOKEN=hlm_... \
HELM_LOG_FILES=/var/www/app/logs/error.log \
pm2 start /opt/helm-collector/index.js --name helm-collector
```

It needs `pm2` on the PATH. For local testing without a build step, `npm run collector:dev`
runs the TypeScript source directly via `tsx`.

## Layout

```
apps/hub/          Next.js app: UI, API routes, health checker, encrypted store, PWA
apps/collector/    Node script that runs on each server under PM2
scripts/           One-off CLI scripts (e.g. decrypting a backup)
deploy/            Nginx template for the hub
ecosystem.config.js  PM2 config for the hub (apps/collector is started on each server instead)
```

## Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the dev setup, lint and
build steps, and code style. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) too.

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint and build on every PR.

## Notes

- Data lives in `apps/hub/data/helm.json` (set `HELM_DATA_FILE` to move it). This is fine for one user. Move to Postgres before running it on several machines.
- Health checks run inside the hub process. Keep the hub on one instance.
- Put the hub behind HTTPS. Do not expose it without the password and session secret set.
