export type NodeEnv = 'development' | 'test' | 'production';

export type Env = {
  NODE_ENV: NodeEnv;
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
};

const DEFAULT_ENV: Env = {
  NODE_ENV: 'development',
  PORT: 3000,
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'background_job_scheduler',
};

const NODE_ENVS: readonly NodeEnv[] = ['development', 'test', 'production'];

export function validateEnv(config: Record<string, unknown>): Env {
  const errors: string[] = [];

  const env: Env = {
    NODE_ENV: parseNodeEnv(config.NODE_ENV, errors),
    PORT: parsePort(config.PORT, 'PORT', DEFAULT_ENV.PORT, errors),
    DB_HOST: parseNonEmptyString(
      config.DB_HOST,
      'DB_HOST',
      DEFAULT_ENV.DB_HOST,
      errors,
    ),
    DB_PORT: parsePort(config.DB_PORT, 'DB_PORT', DEFAULT_ENV.DB_PORT, errors),
    DB_USERNAME: parseNonEmptyString(
      config.DB_USERNAME,
      'DB_USERNAME',
      DEFAULT_ENV.DB_USERNAME,
      errors,
    ),
    DB_PASSWORD: parseNonEmptyString(
      config.DB_PASSWORD,
      'DB_PASSWORD',
      DEFAULT_ENV.DB_PASSWORD,
      errors,
    ),
    DB_NAME: parseNonEmptyString(
      config.DB_NAME,
      'DB_NAME',
      DEFAULT_ENV.DB_NAME,
      errors,
    ),
  };

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join('; ')}`);
  }

  return env;
}

function parseNodeEnv(value: unknown, errors: string[]): NodeEnv {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_ENV.NODE_ENV;
  }

  if (typeof value === 'string' && NODE_ENVS.includes(value as NodeEnv)) {
    return value as NodeEnv;
  }

  errors.push(`NODE_ENV must be one of: ${NODE_ENVS.join(', ')}`);
  return DEFAULT_ENV.NODE_ENV;
}

function parsePort(
  value: unknown,
  key: string,
  fallback: number,
  errors: string[],
): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
    return parsed;
  }

  errors.push(`${key} must be an integer between 1 and 65535`);
  return fallback;
}

function parseNonEmptyString(
  value: unknown,
  key: string,
  fallback: string,
  errors: string[],
): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  errors.push(`${key} must be a non-empty string`);
  return fallback;
}
