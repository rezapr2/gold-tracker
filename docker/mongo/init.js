db = db.getSiblingDB('gold-tracker');

db.createCollection('gold_prices');
db.createCollection('price_statistics');
db.createCollection('publish_logs');
db.createCollection('bot_settings');

db.gold_prices.createIndex({ timestamp: -1 });
db.gold_prices.createIndex({ timestamp: -1, provider: 1 });
db.gold_prices.createIndex({ isHourlyAggregate: 1, timestamp: -1 });
db.gold_prices.createIndex({ isDailyAggregate: 1, timestamp: -1 });

db.price_statistics.createIndex({ period: 1, periodStart: -1 });
db.publish_logs.createIndex({ createdAt: -1 });
db.bot_settings.createIndex({ key: 1 }, { unique: true });

print('Gold Tracker database initialized');
