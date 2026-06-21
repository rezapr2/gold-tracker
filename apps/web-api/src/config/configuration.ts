export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@goldtracker.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});
