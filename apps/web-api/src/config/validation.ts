import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3001),

  RABBITMQ_URL: Joi.string()
    .uri({ scheme: ['amqp', 'amqps'] })
    .when('NODE_ENV', { is: 'production', then: Joi.required() }),

  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(16).invalid('jwt-secret').required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  ADMIN_EMAIL: Joi.string().email({ tlds: false }),
  ADMIN_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.when('ADMIN_PASSWORD_HASH', {
      is: Joi.string().min(1).required(),
      then: Joi.string().invalid('Admin@123456').optional(),
      otherwise: Joi.string().invalid('Admin@123456').required(),
    }),
  }),
  ADMIN_PASSWORD_HASH: Joi.string().allow(''),

  REDIS_HOST: Joi.string().allow(''),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow(''),

  FRONTEND_URL: Joi.string().uri().allow(''),
});

export const validationOptions = { allowUnknown: true, abortEarly: false };
