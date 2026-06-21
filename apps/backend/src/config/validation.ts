import * as Joi from 'joi';

/**
 * Validates environment variables at boot so the process fails fast on a
 * misconfiguration instead of silently running with insecure defaults.
 *
 * In production this rejects the shipped placeholder secrets (a JWT signed with
 * the default key would be trivially forgeable) and requires the operator to set
 * real values. In development/test the same vars fall back to the defaults in
 * configuration.ts, so local runs need no setup.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3001),

  // Required in production; dev/test use the localhost default in configuration.ts.
  MONGODB_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .when('NODE_ENV', { is: 'production', then: Joi.required() }),

  APP_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(16).invalid('default-secret').required(),
  }),
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(16).invalid('jwt-secret').required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  ADMIN_EMAIL: Joi.string().email({ tlds: false }),
  // In production an admin credential must be supplied and must not be the shipped
  // default: require a bcrypt hash, or a non-default plaintext password if no hash.
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

/** Options paired with the schema: keep unrecognised vars, report every error. */
export const validationOptions = {
  allowUnknown: true,
  abortEarly: false,
};
