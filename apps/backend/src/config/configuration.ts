export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  appSecret: process.env.APP_SECRET || 'default-secret',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gold-tracker',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@goldtracker.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    // Optional bcrypt hash; takes precedence over the plaintext password.
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
  },

  apis: {
    // Free, keyless metals API — used first so quota-limited providers are backups.
    goldApiCom: {
      baseUrl: process.env.GOLD_API_COM_URL || 'https://api.gold-api.com',
    },
    goldapi: {
      key: process.env.GOLDAPI_KEY || '',
      baseUrl: 'https://www.goldapi.io/api',
    },
    metalsDev: {
      key: process.env.METALS_DEV_KEY || '',
      baseUrl: 'https://api.metals.dev/v1',
    },
    twelveData: {
      key: process.env.TWELVE_DATA_KEY || '',
      baseUrl: 'https://api.twelvedata.com',
    },
    alphaVantage: {
      key: process.env.ALPHA_VANTAGE_KEY || '',
      baseUrl: 'https://www.alphavantage.co/query',
    },
  },

  telegram: {
    // Gold bot
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '',
    // Silver bot (separate token + channel)
    silverBotToken: process.env.TELEGRAM_SILVER_BOT_TOKEN || '',
    silverChannelId: process.env.TELEGRAM_SILVER_CHANNEL_ID || '',
    // Attach a trend chart image to scheduled updates / daily summaries.
    sendCharts: process.env.TELEGRAM_SEND_CHARTS !== 'false',
    // Enable interactive commands (/gold, /silver, /ratio) via long-polling.
    // Off by default — polling needs exactly one running instance per token.
    commandsEnabled: process.env.TELEGRAM_COMMANDS_ENABLED === 'true',
  },

  quickchart: {
    // QuickChart-compatible chart-render endpoint. Point at a self-hosted
    // instance for fully private rendering.
    url: process.env.QUICKCHART_URL || 'https://quickchart.io',
  },

  scheduler: {
    priceFetchInterval: process.env.PRICE_FETCH_INTERVAL || '*/1 * * * *',
    telegramPublishInterval: process.env.TELEGRAM_PUBLISH_INTERVAL || '*/30 * * * *',
    cleanupInterval: process.env.CLEANUP_INTERVAL || '0 2 * * *',
  },

  alerts: {
    priceChangeThreshold: parseFloat(process.env.PRICE_ALERT_THRESHOLD) || 1.5,
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});
