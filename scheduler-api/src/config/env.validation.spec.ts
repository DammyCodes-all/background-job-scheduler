import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('uses local defaults when optional env vars are missing', () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_NAME: 'background_job_scheduler',
    });
  });

  it('coerces numeric env vars', () => {
    expect(
      validateEnv({
        PORT: '3001',
        DB_PORT: '5433',
      }),
    ).toMatchObject({
      PORT: 3001,
      DB_PORT: 5433,
    });
  });

  it('rejects invalid startup configuration', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'staging',
        PORT: 'abc',
        DB_PORT: '99999',
        DB_HOST: '',
      }),
    ).toThrow(
      'Invalid environment configuration: NODE_ENV must be one of: development, test, production; PORT must be an integer between 1 and 65535; DB_HOST must be a non-empty string; DB_PORT must be an integer between 1 and 65535',
    );
  });
});
