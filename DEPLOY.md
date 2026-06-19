# Deployment Guide — Ubuntu Server

How to **install** and **update** Gold & Silver Tracker on a fresh Ubuntu
server using Docker Compose.

The whole stack runs in containers, so the only host dependencies are Docker
and the Compose plugin. Data lives in named Docker volumes (`mongo_data`,
`redis_data`), which **survive code updates** — you only lose data if you
explicitly delete the volumes.

---

## 1. Which stack do I deploy?

| File | What it runs | Use when |
|---|---|---|
| `docker-compose.prod.yml` | **Full stack** — MongoDB, Redis, backend, frontend, Nginx (HTTP/HTTPS) | One server hosts the whole site (dashboard + API). **Default — start here.** |
| `docker-compose.vm.yml` | **Backend only** — MongoDB, Redis, backend, Nginx (API + WebSocket) | Frontend is hosted separately (e.g. Vercel); the VM serves only the API. See [Appendix A](#appendix-a--backend-only-vm-deployment). |
| `docker-compose.yml` | Local dev (ports exposed, no auth, hot reload) | **Not for production.** |

This guide uses `docker-compose.prod.yml` unless stated otherwise.

```
                         Internet
                            │  :80 / :443
                      ┌─────▼─────┐
                      │   Nginx   │  TLS, rate-limit, reverse proxy
                      └──┬─────┬──┘
            /  (UI)      │     │   /api/  /socket.io/
                  ┌──────▼─┐ ┌─▼────────┐
                  │frontend│ │ backend  │  NestJS API + WebSocket
                  │ :3000  │ │  :3001   │
                  └────────┘ └─┬──────┬─┘
                               │      │
                        ┌──────▼┐  ┌──▼─────┐
                        │MongoDB│  │ Redis  │   (internal network only)
                        └───────┘  └────────┘
```

Only Nginx (`80`/`443`) is published to the host. Backend, frontend, MongoDB,
and Redis are reachable only on the internal Docker network.

---

## 2. Prerequisites

- **Server:** Ubuntu 22.04 LTS or newer, ≥ 2 GB RAM, ≥ 20 GB disk, root/sudo access.
- **Domain:** a DNS **A record** pointing your domain (e.g. `aprice.online`) at the server's public IP. Required before issuing TLS certificates.
- **Firewall:** allow SSH (22), HTTP (80), HTTPS (443).
- **API keys:** at least one gold-price provider key (GoldAPI / Metals.dev / TwelveData / AlphaVantage). Telegram tokens are optional.

### 2.1 Open the firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 2.2 Install Docker + Compose plugin

```bash
curl -fsSL https://get.docker.com | sh

# Run docker without sudo (log out / back in afterwards for it to take effect)
sudo usermod -aG docker $USER

# Verify
docker --version
docker compose version
```

> The install script ships Compose v2, invoked as **`docker compose`** (space).
> If your box only has the legacy **`docker-compose`** (hyphen) binary, the
> commands below work the same — just swap the hyphen in.

---

## 3. First-time install

### 3.1 Clone the repository

```bash
sudo mkdir -p /opt/gold-tracker
sudo chown $USER:$USER /opt/gold-tracker
git clone https://github.com/rezapr2/gold-tracker.git /opt/gold-tracker
cd /opt/gold-tracker
```

### 3.2 Create the **root** `.env` (Compose variables)

`docker-compose.prod.yml` interpolates these from a `.env` file in the repo
root (the directory you run `docker compose` from). Create it:

```bash
cat > /opt/gold-tracker/.env <<'EOF'
# --- MongoDB credentials (used to build the backend MONGODB_URI) ---
MONGO_ROOT_USER=goldadmin
MONGO_ROOT_PASSWORD=change-me-strong-mongo-password

# --- Redis ---
REDIS_PASSWORD=change-me-strong-redis-password

# --- Public URLs baked into the frontend at BUILD time ---
# Same origin as your domain; Nginx proxies /api and /socket.io to the backend.
NEXT_PUBLIC_API_URL=https://aprice.online
NEXT_PUBLIC_WS_URL=https://aprice.online
EOF

chmod 600 /opt/gold-tracker/.env
```

> ⚠️ `NEXT_PUBLIC_*` are **build-time** values. If you change them later you
> must rebuild the frontend image (see [§4 Updating](#4-updating-to-a-new-release)).

### 3.3 Create the **backend** `.env` (application config)

```bash
cp apps/backend/.env.example apps/backend/.env
nano apps/backend/.env
```

Set these at minimum (Compose overrides `MONGODB_URI`, `REDIS_*` from the root
`.env`, so you don't need to repeat the DB connection strings here):

```env
NODE_ENV=production
APP_SECRET=<long-random-string>
JWT_SECRET=<long-random-string>

# Admin login for the dashboard
ADMIN_EMAIL=rezapr2@gmail.com
ADMIN_PASSWORD=<strong-admin-password>

# At least one price provider
GOLDAPI_KEY=...
METALS_DEV_KEY=...
TWELVE_DATA_KEY=...
ALPHA_VANTAGE_KEY=...

# Telegram (optional — can also be set later in the Settings UI)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=
TELEGRAM_SILVER_BOT_TOKEN=
TELEGRAM_SILVER_CHANNEL_ID=

# CORS — your public origin
FRONTEND_URL=https://aprice.online
```

Generate strong secrets with: `openssl rand -hex 32`

### 3.4 Nginx domain

`docker/nginx/default.conf` is already configured for **`aprice.online`**
(both `server_name` and the TLS certificate paths), so there's nothing to edit
here. If you ever move to a different domain, update it with:

```bash
sed -i 's/aprice\.online/newdomain.com/g' docker/nginx/default.conf
```

### 3.5 Issue the TLS certificate (Let's Encrypt)

Nginx mounts `/etc/letsencrypt` read-only, so obtain the certificate on the
**host** first. Use standalone mode (port 80 must be free — make sure Nginx
isn't already running):

```bash
sudo apt update && sudo apt install -y certbot
sudo certbot certonly --standalone -d aprice.online --agree-tos -m rezapr2@gmail.com --no-eff-email
```

This writes the cert to `/etc/letsencrypt/live/aprice.online/`, which the
Nginx container reads. Renewal is covered in [§6](#6-renewing-the-tls-certificate).

> **HTTP-only / no domain yet?** Skip this step and use the backend-only API
> config (`docker/nginx/api.conf`, listens on `:80`) instead, or comment out
> the `443` server block in `default.conf`. You can add TLS later.

### 3.6 Build and start

```bash
cd /opt/gold-tracker
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes a few minutes. Watch progress / logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

### 3.7 Verify

```bash
# Nginx + backend health
curl -sf https://aprice.online/health && echo " nginx OK"
curl -sf https://aprice.online/api/v1/health && echo " backend OK"
```

Then open `https://aprice.online` in a browser. Log in to the admin area with
the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set above.

### 3.8 (Optional) Backfill historical prices

The tracker only records prices going forward, so charts start empty. To seed
years of daily history (requires `TWELVE_DATA_KEY`), call the authenticated
API — the production image is dev-stripped, so the `npm run backfill` script
is **not** available inside the prod container; use the endpoint:

```bash
# 1. Get a token
TOKEN=$(curl -s -X POST https://aprice.online/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"rezapr2@gmail.com","password":"<admin-password>"}' \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# 2. Backfill (idempotent — safe to re-run)
curl -X POST "https://aprice.online/api/v1/prices/backfill?days=1000" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Updating to a new release

Code updates do **not** touch the `mongo_data` / `redis_data` volumes, so your
price history and settings are preserved.

```bash
cd /opt/gold-tracker

# 1. Pull the latest code
git pull origin main

# 2. Rebuild changed images and recreate containers
docker compose -f docker-compose.prod.yml up -d --build

# 3. Confirm everything is healthy
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=50 backend

# 4. Reclaim disk from old image layers
docker image prune -f
```

That's the whole update loop. A few notes:

- **Frontend env changes** (`NEXT_PUBLIC_*` in the root `.env`) only take effect
  after a rebuild — `--build` handles that.
- **Backend env changes** (`apps/backend/.env`) need a container recreate, which
  `up -d` does automatically when it detects the change. If in doubt:
  `docker compose -f docker-compose.prod.yml up -d --force-recreate backend`
- **Nginx config changes** (`docker/nginx/*.conf`) — the files are bind-mounted,
  so just reload: `docker compose -f docker-compose.prod.yml restart nginx`
- **Rebuild a single service** instead of all:
  `docker compose -f docker-compose.prod.yml up -d --build backend`

### Roll back

```bash
cd /opt/gold-tracker
git log --oneline -n 10          # find the previous good commit
git checkout <commit-sha>
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 5. Common operations

```bash
cd /opt/gold-tracker
C="docker compose -f docker-compose.prod.yml"   # shorthand

$C ps                       # status of all services
$C logs -f backend          # follow backend logs
$C logs --tail=100 nginx    # last 100 nginx lines
$C restart backend          # restart one service
$C stop                     # stop everything (keeps data)
$C start                    # start again
$C down                     # stop + remove containers (keeps named volumes)
$C exec backend sh          # shell inside the backend container
$C exec mongodb mongosh -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin
```

> `down` keeps your data. **`down -v` deletes the volumes** (MongoDB + Redis
> data) — only use it when you intentionally want a clean slate. On the next
> startup with an empty volume, `docker/mongo/init.js` recreates the indexes.

---

## 6. Renewing the TLS certificate

Let's Encrypt certs last 90 days. The `certbot` apt package installs a renewal
timer automatically, but standalone renewal needs port 80, which Nginx holds —
so stop/start the Nginx container around the renewal with hooks:

```bash
sudo certbot renew \
  --pre-hook  "docker compose -f /opt/gold-tracker/docker-compose.prod.yml stop nginx" \
  --post-hook "docker compose -f /opt/gold-tracker/docker-compose.prod.yml start nginx"
```

Test the automatic renewal path without making changes:

```bash
sudo certbot renew --dry-run
```

After any successful renewal, Nginx picks up the new cert on restart (the
`--post-hook` above handles that).

---

## 7. Backups & restore

Back up MongoDB regularly. The dump runs inside the container against the
named volume:

```bash
cd /opt/gold-tracker
source .env   # load MONGO_ROOT_USER / MONGO_ROOT_PASSWORD

# Create a dated archive on the host
docker compose -f docker-compose.prod.yml exec -T mongodb \
  mongodump --username "$MONGO_ROOT_USER" --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin --db gold-tracker --archive \
  > "backup-$(date +%F).archive"
```

Restore from an archive:

```bash
source .env
cat backup-YYYY-MM-DD.archive | docker compose -f docker-compose.prod.yml exec -T mongodb \
  mongorestore --username "$MONGO_ROOT_USER" --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin --archive --drop
```

> Consider a cron job that runs the dump nightly and ships the archive
> off-server (e.g. to object storage).

---

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| `502 Bad Gateway` | Backend/frontend not up yet or crashed: `... logs backend`, `... ps`. |
| Nginx won't start, cert error | TLS cert missing or domain mismatch. Confirm `/etc/letsencrypt/live/<domain>/` exists and `default.conf` uses the same domain (§3.4–3.5). |
| `MONGODB_URI` auth fails | Root `.env` `MONGO_ROOT_USER`/`PASSWORD` changed **after** the volume was created. Mongo credentials are fixed at first init — either use the original creds or recreate the volume (`down -v`, destroys data). |
| Frontend shows wrong API URL | `NEXT_PUBLIC_*` is build-time. Fix the root `.env`, then `up -d --build frontend`. |
| Prices not updating | Provider errors in `... logs backend`. See [§8.1](#81-price-providers--rate-limits) — usually the fetch interval is too aggressive for free API tiers. |
| Changes to `apps/backend/.env` ignored | `... up -d --force-recreate backend`. |
| Out of disk | `docker image prune -f` and `docker system df`. |

### 8.1 Price providers & rate limits

The price-fetch cron runs every `PRICE_FETCH_INTERVAL` **and loops over every
asset** (gold + silver), so each tick makes up to 2× the requests. The chain is
gold-api.com → GoldAPI → Metals.dev → TwelveData → AlphaVantage; the first
success wins. **gold-api.com is free and keyless**, so with it in front the
quota-limited providers below are only used if it's unreachable.

> ⚠️ The default interval is `*/1 * * * *` (every minute). Across 2 metals that's
> **~2,880 requests/day per provider** — which **exhausts every free tier** and
> produces `403` (GoldAPI: ~100/month), `429` (TwelveData: 800/day), etc. **On a
> real deployment, raise the interval.**

**Recommended:** `PRICE_FETCH_INTERVAL=*/15 * * * *` (≈192 req/day across both
metals — within TwelveData's free 800/day). Change it either in the dashboard
**Settings** page (stored in DB, applied live — no restart) or in
`apps/backend/.env` followed by
`docker compose -f docker-compose.prod.yml up -d --force-recreate backend`.

**Diagnosing provider failures** (keys resolve **DB-first**, env fallback):

```bash
cd /opt/gold-tracker && source .env
C="docker compose -f docker-compose.prod.yml"

# Effective keys + interval (DB overrides .env)
$C exec -T mongodb mongosh -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin gold-tracker --quiet --eval \
  'printjson(db.bot_settings.findOne({key:"default"},{_id:0,goldApiKey:1,metalsDevKey:1,twelveDataKey:1,alphaVantageKey:1,priceFetchInterval:1}))'

# Test a key directly — the response body says quota-vs-bad-key
curl -s -H "x-access-token: <GOLDAPI_KEY>" https://www.goldapi.io/api/XAU/USD; echo
curl -s "https://api.twelvedata.com/price?symbol=XAU/USD&apikey=<KEY>"; echo
```

| Symptom | Cause / fix |
|---|---|
| `403` (GoldAPI) | Invalid key, or monthly quota spent. Free ~100/mo can't sustain polling — raise the interval or use a paid plan. |
| `429` (TwelveData) | Daily credit cap (free 800/day). Raise the interval; a `backfill` also burns credits. |
| `getaddrinfo ENOTFOUND api.metals.dev` | DNS can't resolve the host. If the host resolves but the container can't, it's Docker DNS; otherwise the provider is down — rely on another. |
| `... API key not configured` (warn) | Key empty in both DB and env; that provider is skipped. Set at least one working key. |

---

## Appendix A — Backend-only (VM) deployment

Use `docker-compose.vm.yml` when the frontend is hosted elsewhere (e.g. Vercel)
and this server serves only the API + WebSocket. It omits the `frontend`
service and uses `docker/nginx/api.conf` (plain `:80`).

Differences from the full-stack steps above:

1. **Root `.env`** — no `NEXT_PUBLIC_*`; add `FRONTEND_URL` (your Vercel origin,
   used for CORS):

   ```env
   MONGO_ROOT_USER=goldadmin
   MONGO_ROOT_PASSWORD=change-me
   REDIS_PASSWORD=change-me
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

2. **Backend `.env`** — same as §3.3; set `FRONTEND_URL` to the Vercel origin.

3. **Nginx** — `api.conf` listens on `:80` and needs no domain edit or TLS for a
   plain API. To serve the API over HTTPS, add a `443` server block (mirror
   `default.conf`) and issue a cert as in §3.5.

4. **Build & run / update** — identical commands, swap the file:

   ```bash
   docker compose -f docker-compose.vm.yml up -d --build      # install
   git pull origin main && \
   docker compose -f docker-compose.vm.yml up -d --build       # update
   ```

5. Point the Vercel frontend's `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` at
   this server's public URL.
