export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3002,

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gold-tracker',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  },

  // Used only to seed the default settings doc on first boot.
  apis: {
    goldapi: { key: process.env.GOLDAPI_KEY || '' },
    metalsDev: { key: process.env.METALS_DEV_KEY || '' },
    twelveData: { key: process.env.TWELVE_DATA_KEY || '' },
    alphaVantage: { key: process.env.ALPHA_VANTAGE_KEY || '' },
  },

  telegram: {
    sendCharts: process.env.TELEGRAM_SEND_CHARTS !== 'false',
    commandsEnabled: process.env.TELEGRAM_COMMANDS_ENABLED === 'true',
  },

  alerts: {
    priceChangeThreshold: parseFloat(process.env.PRICE_ALERT_THRESHOLD) || 1.5,
  },
});
