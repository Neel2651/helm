# Security policy

Helm stores things that matter: database passwords, third-party API keys, and the credentials
that let it reach your servers and your Google Drive. Treat it accordingly.

## Reporting a vulnerability

Please don't open a public issue for a security problem. Instead, email the maintainer directly
(see the GitHub profile on the repository) with:

- what you found and how to reproduce it
- what you think the impact is (what an attacker could do with it)
- your suggested fix, if you have one

You'll get an acknowledgement within a few days. There's no bug bounty — this is a small,
self-hosted personal project — but real reports are credited in the fix's commit or release notes
unless you'd rather stay anonymous.

## Threat model and what's already handled

- **Secrets at rest.** Database passwords and integration keys are encrypted (AES-256-GCM) in the
  JSON store, keyed by `HELM_ENCRYPTION_KEY`. The UI only ever shows the last 4 characters.
- **Session.** A single-user password, checked with a constant-time comparison, backs a signed
  (HMAC) cookie. There's no account system and no password reset flow — it's one operator.
- **Collector tokens.** Each project has its own token, hashed (SHA-256) before storage, so the
  ingest endpoint never needs to see or store it in plain text.
- **Database checks are not logins.** The reachability check (see the README) only opens a TCP
  connection. It does not run a query, so it can't be used to brute-force credentials through Helm.

## What's on you to get right

Helm is designed to be run privately, by one person, and the project assumes you will:

- Put it behind HTTPS (a reverse proxy like Nginx or Caddy, or a platform that terminates TLS).
- Set `HELM_PASSWORD`, `HELM_SESSION_SECRET` and `HELM_ENCRYPTION_KEY` to long random values, and
  never commit them. `.env.local` is gitignored for this reason.
- Keep a separate backup of `HELM_ENCRYPTION_KEY`. If it's lost, every encrypted value in the
  store becomes permanently unreadable — there is no recovery path by design.
- Use a **read-only** database user for the connection string Helm stores, where the database
  supports it.
- Not expose the hub to the public internet without the above. There is no rate limiting beyond
  the login check, no 2FA, and no audit log of who viewed what (there's only one "who").

## Known limitations (not security bugs, just limits)

- The JSON file store (`apps/hub/data/helm.json`) is read-modify-write with no locking. Concurrent
  writes from two requests at once can lose an update. Fine for one operator; not safe to expose
  to multiple simultaneous admins without moving to a real database first.
- `mongodump` receives the connection string as a process argument during a backup, which other
  local users on the same machine could briefly see in the process list. Run the hub on a machine
  only you use.
