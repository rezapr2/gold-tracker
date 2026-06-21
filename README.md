# Gold & Silver Tracker — Live XAU/USD & XAG/USD Dashboard

A production-ready full-stack application for live precious-metals price tracking (gold **XAU** and silver **XAG**), analytics, Telegram bot notifications, and a professional financial dashboard.

> **Metals:** every price/analytics endpoint accepts a `?metal=XAU|XAG` query param (defaults to `XAU`). Gold and silver each get their own Telegram bot (separate token + channel).

## Architecture

Microservices: the fetchers publish prices to **core** (which owns MongoDB) over
**RabbitMQ**; core re-publishes saved prices/alerts to the publishers.

```
gold-tracker/
├── apps/
│   ├── core/             # owns MongoDB: persist, aggregate, settings, registry; read RPCs
│   ├── fetcher-metals/   # XAU/XAG from the USD price APIs
│   ├── fetcher-estjt/    # Iranian coin/gram-gold (IR_*) scraper
│   ├── web-api/          # HTTP + WebSocket gateway (the site backend)
│   ├── telegram-bot/     # Telegram publishers
│   └── frontend/         # Next.js 14 dashboard
├── packages/
│   └── shared/           # @gold-tracker/shared: contracts, asset registry, RMQ, redis, heartbeat
└── docker/               # Nginx & MongoDB config

#   fetchers ──price.fetched──▶ core ──price.saved/alert──▶ web-api + telegram-bot
#   web-api / telegram-bot ──RPC (prices/analytics/settings)──▶ core
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS microservices, TypeScript, MongoDB/Mongoose, Socket.IO |
| Message bus | RabbitMQ (`@nestjs/microservices`, topic exchange) |
| Scheduler | @nestjs/schedule (node-cron) |
| Auth | JWT + Passport |
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Charts | TradingView Lightweight Charts + Recharts |
| Real-time | Socket.IO |
| Telegram | node-telegram-bot-api |
| Infrastructure | Docker, Docker Compose, Nginx |

## Quick Start

### 1. Clone and configure

```bash
git clone <repo>
cd gold-tracker

# Backend environment — one root .env shared by all services
cp .env.example .env
# Edit .env and fill in your API keys / secrets

# Frontend environment
cp apps/frontend/.env.example apps/frontend/.env.local
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

Services will be available at:
- **Dashboard**: http://localhost (via Nginx)
- **API + WebSocket (web-api)**: http://localhost:3001
- **API Docs (Swagger)**: http://localhost:3001/api/docs
- **RabbitMQ management UI**: http://localhost:15672
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### 3. Local Development (without Docker)

Prerequisites: Node.js 20+, MongoDB, Redis, RabbitMQ

```bash
# Install dependencies
npm install

# Build the shared kernel once (services import @gold-tracker/shared)
npm run build:shared

# Start all services + the frontend in watch mode
npm run dev
```

## Environment Variables

### Backend services (root `.env`)

All services read one root `.env` (see `.env.example`). Docker Compose sets the
service-internal hosts (`MONGODB_URI`, `REDIS_HOST`, `RABBITMQ_URL`).

```env
# Required
MONGODB_URI=mongodb://localhost:27017/gold-tracker
JWT_SECRET=your-super-secret-jwt-key
ADMIN_EMAIL=admin@goldtracker.com
ADMIN_PASSWORD=your-admin-password

# Gold Price APIs (add at least one)
GOLDAPI_KEY=          # https://goldapi.io — primary source
METALS_DEV_KEY=       # https://metals.dev — fallback 1
TWELVE_DATA_KEY=      # https://twelvedata.com — fallback 2
ALPHA_VANTAGE_KEY=    # https://alphavantage.co — fallback 3

# Telegram — Gold bot (optional, configure in Settings UI)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=
# Telegram — Silver bot (separate bot + channel)
TELEGRAM_SILVER_BOT_TOKEN=
TELEGRAM_SILVER_CHANNEL_ID=
TELEGRAM_SEND_CHARTS=true            # attach trend chart images to updates

# Optional
QUICKCHART_URL=https://quickchart.io # chart renderer (self-host for privacy)
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_URL=amqp://localhost:5672   # message bus between services
ESTJT_URL=https://www.estjt.ir/tv/   # Iranian price source (fetcher-estjt)
```

### Frontend (`apps/frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## Features

### Live Gold Price Fetching
- Fetches XAU/USD every minute via configurable cron job
- Multi-provider fallback chain: gold-api.com (free, keyless) → GoldAPI → Metals.dev → TwelveData → AlphaVantage
- Deduplication prevents duplicate price entries
- Graceful error handling — continues on provider failure

### Data Storage (MongoDB — owned by the services that write it)
- **gold_prices** — raw minute-level price data *(core)*
- **price_statistics** — daily/weekly/monthly computed analytics *(core)*
- **bot_settings** — configurable bot/API settings *(core)*
- **service_registry** — live per-instance heartbeats for the admin Services view *(core, TTL-indexed)*
- **publish_logs** / **telegram_channels** — Telegram publish history + channels *(telegram-bot)*
- Hourly and daily aggregates built by cron
- Configurable data retention (default 90 days)

### Analytics
- Daily, weekly, monthly price statistics
- Volatility calculation
- Moving averages (7-day, 30-day)
- OHLC candlestick data for any timeframe

### Telegram Bots (one per metal)
- **Separate gold and silver bots** — each with its own token + channel, posting
  that metal's prices/charts/alerts independently
- **Multiple channels per metal, each with its own message pattern** — configure
  channels via the dashboard (or `PUT /api/v1/telegram/channels`) with a template
  using `{price}`, `{metalName}`, `{dayChangePercent}`, `{ratio}`, … placeholders.
  Leave a channel's template blank to use the built-in layout.
- **Interactive commands** (opt-in via `TELEGRAM_COMMANDS_ENABLED`) — channel users
  can ask the bot for `/gold`, `/silver`, `/ratio` on demand.
- Scheduled price updates every 2 hours
- Daily summary at 20:00 UTC
- **Chart images** — scheduled updates and daily summaries post a 30-day trend
  chart (green/red by direction) rendered via a QuickChart-compatible endpoint
  (self-hostable). Toggle with `TELEGRAM_SEND_CHARTS`; falls back to text if
  rendering is unavailable.
- **Inline "Open Dashboard" button** on messages to drive traffic back to the app
- Configurable price-change alerts (default: ±1.5%, text-only for speed)
- Manual send via dashboard UI
- Publish log with success/failure tracking
- Persian and English message support (configurable)

### Dashboard
- **Live price card** with real-time WebSocket updates
- **TradingView chart** — candlestick, area, and line — with 1H/4H/1D/7D/30D timeframes
- **Analytics page** — 30-day history, daily % change bars, period summaries
- **Telegram page** — bot status, manual send, publish log
- **Settings page** — configure API keys, bot token, thresholds, retention
- Dark/light mode toggle
- WebSocket connection indicator

### API Endpoints

```
GET  /api/v1/prices/latest         Latest gold price
GET  /api/v1/prices/stats          24H and 7D statistics
GET  /api/v1/prices/history        Raw price history
GET  /api/v1/prices/candlestick    OHLC data for charting
GET  /api/v1/prices/hourly         Hourly aggregates
GET  /api/v1/prices/daily          Daily aggregates
GET  /api/v1/prices/ratio          Current gold/silver ratio
GET  /api/v1/prices/export         Price history as CSV (?metal=&hours=)

GET  /api/v1/analytics/summary     Latest daily/weekly/monthly stats
GET  /api/v1/analytics/daily       Daily analytics history
GET  /api/v1/analytics/weekly      Weekly analytics history
GET  /api/v1/analytics/monthly     Monthly analytics history
GET  /api/v1/analytics/moving-average  Moving average data

GET  /api/v1/telegram/status       Bot status
POST /api/v1/telegram/send         Manual price update (auth required)
POST /api/v1/telegram/send-summary Daily summary (auth required)
GET  /api/v1/telegram/logs         Publish history (auth required)
GET  /api/v1/telegram/channels     List channels (auth required)
PUT  /api/v1/telegram/channels     Create/update a channel + template (auth required)
DELETE /api/v1/telegram/channels/:id  Delete a channel (auth required)

POST /api/v1/auth/login            Admin login
GET  /api/v1/auth/profile          Current user (auth required)

GET  /api/v1/health                Liveness/readiness probe

GET  /api/v1/settings              Get settings (auth required)
PUT  /api/v1/settings              Update settings (auth required)

GET  /api/v1/admin/services        Live status of every microservice (auth required)
```

### WebSocket Events

```
price:update   New price saved (emitted to all clients)
price:alert    Significant price change alert
ping / pong    Connectivity check
```

## Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token
3. Add the bot as an admin to your channel
4. Copy your channel ID (e.g., `@my_channel` or `-100123456789`)
5. Enter both in the **Settings** page of the dashboard — or in `.env`

## Production Deployment (Ubuntu)

> 📖 **Full step-by-step install & update guide:** [DEPLOY.md](DEPLOY.md) — covers the root `.env`, TLS, the full-stack vs backend-only stacks, updates, backups, and troubleshooting. Quick version below.

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone and configure
git clone <repo> /opt/gold-tracker
cd /opt/gold-tracker

# Set production env vars (single root .env)
cp .env.example .env
# Edit .env with production values

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs (web-api is the HTTP/WS entrypoint; or core/fetcher-metals/…)
docker-compose logs -f web-api
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot
certbot certonly --standalone -d aprice.online
# default.conf is already wired for aprice.online + /etc/letsencrypt
```

## Testing

```bash
# All service unit/integration tests (builds the shared kernel first)
npm test

# A single service
npm test --workspace=apps/core
```

## Adding a New Price Provider

1. Create `apps/fetcher-metals/src/providers/my-provider.ts` implementing
   `PriceProvider` (`supports()` + `fetchPrice(): Promise<GoldPriceData | null>`)
2. Register it in `FetchModule` providers and add it to the failover list in
   `fetch.service.ts`
3. List the provider's `name` under each asset it serves in the registry
   (`packages/shared/src/assets/asset.types.ts`)

For a whole new *source* (e.g. another scraper), add a sibling `apps/fetcher-*`
service that emits `price.fetched` — core ingests it with no changes.

## License

MIT
