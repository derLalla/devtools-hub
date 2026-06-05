import pino from 'pino';
import { loadConfig } from './config';

const config = (() => {
  try {
    return loadConfig();
  } catch {
    return { LOG_LEVEL: 'info', NODE_ENV: 'development' } as { LOG_LEVEL: string; NODE_ENV: string };
  }
})();

export const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
  redact: {
    paths: ['req.headers.authorization', 'password', '*.password', '*.passwordHash'],
    censor: '[redacted]'
  }
});
