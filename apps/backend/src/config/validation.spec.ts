import { validationSchema, validationOptions } from './validation';

const validate = (env: Record<string, string>) =>
  validationSchema.validate(env, validationOptions);

describe('env validationSchema', () => {
  describe('development', () => {
    it('accepts an empty environment and applies defaults', () => {
      const { error, value } = validate({ NODE_ENV: 'development' });
      expect(error).toBeUndefined();
      expect(value.PORT).toBe(3001);
      expect(value.JWT_EXPIRES_IN).toBe('7d');
    });

    it('does not require secrets outside production', () => {
      const { error } = validate({ NODE_ENV: 'development', APP_SECRET: 'default-secret' });
      expect(error).toBeUndefined();
    });

    it('keeps unknown vars (API keys, telegram tokens, …)', () => {
      const { error, value } = validate({ NODE_ENV: 'development', GOLDAPI_KEY: 'abc' });
      expect(error).toBeUndefined();
      expect(value.GOLDAPI_KEY).toBe('abc');
    });
  });

  describe('production', () => {
    const prodBase = {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://db:27017/gold',
      APP_SECRET: 'a-long-enough-app-secret',
      JWT_SECRET: 'a-long-enough-jwt-secret',
      ADMIN_PASSWORD_HASH: '$2a$10$hash',
    };

    it('accepts a fully configured production env', () => {
      expect(validate(prodBase).error).toBeUndefined();
    });

    it('rejects the placeholder APP_SECRET / JWT_SECRET', () => {
      expect(validate({ ...prodBase, APP_SECRET: 'default-secret' }).error).toBeDefined();
      expect(validate({ ...prodBase, JWT_SECRET: 'jwt-secret' }).error).toBeDefined();
    });

    it('requires APP_SECRET and JWT_SECRET to be present', () => {
      const { APP_SECRET, ...noAppSecret } = prodBase;
      expect(validate(noAppSecret).error).toBeDefined();
    });

    it('requires MONGODB_URI', () => {
      const { MONGODB_URI, ...noUri } = prodBase;
      expect(validate(noUri).error).toBeDefined();
    });

    it('requires an admin credential when neither password nor hash is set', () => {
      const { ADMIN_PASSWORD_HASH, ...noCreds } = prodBase;
      expect(validate(noCreds).error).toBeDefined();
    });

    it('accepts a non-default admin password instead of a hash', () => {
      const { ADMIN_PASSWORD_HASH, ...rest } = prodBase;
      expect(validate({ ...rest, ADMIN_PASSWORD: 'a-real-password' }).error).toBeUndefined();
    });

    it('rejects the default admin password', () => {
      const { ADMIN_PASSWORD_HASH, ...rest } = prodBase;
      expect(validate({ ...rest, ADMIN_PASSWORD: 'Admin@123456' }).error).toBeDefined();
    });
  });
});
