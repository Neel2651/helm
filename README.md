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
2. On the OAuth consent screen, press **Publish app** so it is **In production**. A consent screen
   left in "Testing" makes every refresh token expire after 7 days, which is the usual reason
   backups stop working a week after they were set up.
3. Create an OAuth client of type **Web application**. Add the hub's callback as an authorised
   redirect URI: `https://helm.example.com/api/google/callback`. Settings shows the exact string
   to paste, and Google matches it character for character.
4. Put the client ID and secret in the hub's `.env.local` as `HELM_GOOGLE_CLIENT_ID` and
   `HELM_GOOGLE_CLIENT_SECRET`, set `HELM_PUBLIC_URL` to the hub's public origin, and restart it.
5. Open **Settings → Google Drive** in Helm and press **Connect Google Drive**.

Helm then renews its own access indefinitely. It only ever asks for the `drive.file` scope, so it
can see the files and folders it creates and nothing else in the Drive. Press **Disconnect** to
revoke it.

If a connection does break, Settings says what Google actually returned and Telegram gets an alert
straight away, rather than it surfacing at the next scheduled backup.

`HELM_GOOGLE_REFRESH_TOKEN` is still honoured for hubs set up before Settings existed. Connecting
in the app replaces it.

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

Run **one collector per server, not one per project**. It reports everything on the machine,
and the hub splits that across the projects living there.

The collector is written in TypeScript but ships as a single plain JavaScript file, so the
server it runs on needs nothing beyond Node.js and PM2 — no TypeScript toolchain, no
`npm install`.

```bash
npm run build:collector                        # compiles apps/collector/index.ts -> dist/index.js
scp apps/collector/dist/index.js your-server:/opt/helm-collector/index.js
```

Then on that server, listing every project's log files:

```bash
HELM_HUB_URL=https://helm.example.com \
HELM_COLLECTOR_TOKEN=hlm_... \
HELM_LOG_FILES=/var/www/shop/logs/error.log,/var/www/blog/logs/error.log \
pm2 start /opt/helm-collector/index.js --name helm-collector
pm2 save                                       # survive a reboot
```

It needs `pm2` on the PATH. For local testing without a build step, `npm run collector:dev`
runs the TypeScript source directly via `tsx`.

### Several projects on one server

The collector sends every PM2 process and every matching log line it can see. The hub hands
each project only what it has claimed, using two fields in the project's settings:

- **PM2 process names** — the processes belonging to this project
- **Log file paths** — the log files belonging to this project

So a box running `shop-api`, `blog-web` and `crm-api` needs one collector, and each project
sees only its own process. A crash in `crm-api` raises an alert against CRM, not against
whichever project happens to own the collector's token.

Anything no project claims — an unrelated worker, a log file nobody listed — goes to the
project whose token the collector uses. That means a project with both fields left empty
keeps seeing everything, as it did before, so existing installs need no changes.

The token authenticates the push rather than scoping it: a collector updates every project
whose processes it reports, so treat the token as belonging to the server.

Only projects mentioned in a push are touched, so a collector on one server never blanks out
the status of a project running on another.

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
