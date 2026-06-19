// Authoritative index definitions for the Gold Tracker database.
//
// This is the single source of truth for indexes in production, where the
// backend runs with Mongoose `autoIndex` disabled (see apps/backend/src/app.module.ts).
// It only runs on a fresh data volume (Mongo's /docker-entrypoint-initdb.d hook),
// so keep it in sync with the @Schema index declarations in the backend.

db = db.getSiblingDB('gold-tracker');

db.createCollection('gold_prices');
db.createCollection('price_statistics');
db.createCollection('publish_logs');
db.createCollection('telegram_channels');
db.createCollection('bot_settings');

// gold_prices — minute-level points + hourly/daily aggregates, queried per metal.
// Mirrors gold-price/schemas/gold-price.schema.ts.
db.gold_prices.createIndex({ timestamp: -1 });
db.gold_prices.createIndex({ timestamp: -1, provider: 1 });
db.gold_prices.createIndex({ metal: 1, timestamp: -1 });
db.gold_prices.createIndex({ metal: 1, isHourlyAggregate: 1, timestamp: -1 });
db.gold_prices.createIndex({ metal: 1, isDailyAggregate: 1, timestamp: -1 });

// price_statistics — mirrors analytics/schemas/price-statistics.schema.ts.
db.price_statistics.createIndex({ metal: 1 });
db.price_statistics.createIndex({ metal: 1, period: 1, periodStart: -1 });
db.price_statistics.createIndex({ periodStart: -1 });

// publish_logs — mirrors telegram/schemas/publish-log.schema.ts.
db.publish_logs.createIndex({ metal: 1 });
db.publish_logs.createIndex({ createdAt: -1 });
db.publish_logs.createIndex({ type: 1, status: 1 });

// telegram_channels — mirrors telegram/schemas/telegram-channel.schema.ts.
db.telegram_channels.createIndex({ metal: 1, enabled: 1 });
db.telegram_channels.createIndex({ channelId: 1, metal: 1 }, { unique: true });

// bot_settings — mirrors settings/schemas/settings.schema.ts.
db.bot_settings.createIndex({ key: 1 }, { unique: true });

print('Gold Tracker database initialized');
