import * as Joi from 'joi';

/** Boot-time env validation: fail fast on misconfiguration in production. */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3002),

  MONGODB_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .when('NODE_ENV', { is: 'production', then: Joi.required() }),

  RABBITMQ_URL: Joi.string()
    .uri({ scheme: ['amqp', 'amqps'] })
    .when('NODE_ENV', { is: 'production', then: Joi.required() }),

  REDIS_HOST: Joi.string().allow(''),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow(''),
});

export const validationOptions = { allowUnknown: true, abortEarly: false };
