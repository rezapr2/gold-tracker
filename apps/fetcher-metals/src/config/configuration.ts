export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3003,

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  },

  apis: {
    goldApiCom: { baseUrl: process.env.GOLD_API_COM_URL || 'https://api.gold-api.com' },
    goldapi: { baseUrl: 'https://www.goldapi.io/api' },
    metalsDev: { baseUrl: 'https://api.metals.dev/v1' },
    twelveData: { baseUrl: 'https://api.twelvedata.com' },
    alphaVantage: { baseUrl: 'https://www.alphavantage.co/query' },
  },
});
