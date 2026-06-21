export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3005,

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

  quickchart: {
    url: process.env.QUICKCHART_URL || 'https://quickchart.io',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});
