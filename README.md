# Gold & Silver Tracker — Live XAU/USD & XAG/USD Dashboard

A production-ready full-stack application for live precious-metals price tracking (gold **XAU** and silver **XAG**), analytics, Telegram bot notifications, and a professional financial dashboard.

> **Metals:** every price/analytics endpoint accepts a `?metal=XAU|XAG` query param (defaults to `XAU`). Gold and silver each get their own Telegram bot (separate token + channel).

## Architecture

```
gold-tracker/
├── apps/
│   ├── backend/          # NestJS API + WebSocket server
│   └── frontend/         # Next.js 14 dashboard
├── packages/
│   └── shared/           # Shared TypeScript types
└── docker/               # Nginx & MongoDB config
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS, TypeScript, MongoDB/Mongoose, Socket.IO |
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

# Backend environment
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env and fill in your API keys

# Frontend environment
cp apps/frontend/.env.example apps/frontend/.env.local
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

Services will be available at:
- **Dashboard**: http://localhost (via Nginx)
- **Backend API**: http://localhost:3001
- **API Docs (Swagger)**: http://localhost:3001/api/docs
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### 3. Local Development (without Docker)

Prerequisites: Node.js 20+, MongoDB, Redis

```bash
# Install dependencies
npm install

# Start both apps in watch mode
npm run dev
```

## Environment Variables

### Backend (`apps/backend/.env`)

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
PORT=3001
```

### Frontend (`apps/frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## Features

### Live Gold Price Fetching
- Fetches XAU/USD every minute via configurable cron job
- Multi-provider fallback chain: GoldAPI → Metals.dev → TwelveData → AlphaVantage
- Deduplication prevents duplicate price entries
- Graceful error handling — continues on provider failure

### Data Storage (MongoDB)
- **gold_prices** — raw minute-level price data
- **price_statistics** — daily/weekly/monthly computed analytics
- **publish_logs** — Telegram publish history
- **bot_settings** — configurable bot/API settings
- Hourly and daily aggregates built by cron
- Configurable data retention (default 90 days)

#### Historical backfill (one-time)

The tracker only records prices going forward, so charts start empty. To seed
years of daily history in one shot (idempotent — safe to re-run), run with a
`TWELVE_DATA_KEY` set:

```bash
# CLI (default ~5000 days, or pass a day count)
npm run backfill --workspace=apps/backend
npm run backfill --workspace=apps/backend -- 1000

# In Docker
docker-compose exec backend npm run backfill -- 1000

# Or via the authenticated API
curl -X POST "http://localhost:3001/api/v1/prices/backfill?days=1000" \
  -H "Authorization: Bearer <token>"
```

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
POST /api/v1/prices/backfill       One-time historical import (auth required)

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

GET  /api/v1/health                Liveness/readiness probe (DB status)

GET  /api/v1/settings              Get settings (auth required)
PUT  /api/v1/settings              Update settings (auth required)
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

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone and configure
git clone <repo> /opt/gold-tracker
cd /opt/gold-tracker

# Set production env vars
cp apps/backend/.env.example apps/backend/.env
# Edit .env with production values

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose logs -f backend
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot
certbot certonly --standalone -d yourdomain.com
# Then update docker/nginx/default.conf to add SSL config
```

## Testing

```bash
# Unit tests
cd apps/backend && npm test

# Integration tests
cd apps/backend && npm run test:e2e

# Coverage report
cd apps/backend && npm run test:cov
```

## Adding a New Price Provider

1. Create `apps/backend/src/modules/gold-price/providers/my-provider.ts`
2. Implement `fetchPrice(): Promise<GoldPriceData | null>`
3. Register in `GoldPriceModule` providers array
4. Inject into `GoldPriceService` and add to the `providers` array in `fetchAndSavePrice()`

## License

MIT
