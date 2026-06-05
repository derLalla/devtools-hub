import 'dotenv/config';
import { createApp } from './app';
import { loadConfig } from './config';
import { connectMongo, disconnectMongo } from './db';
import { seedAdmin } from './seed';
import { logger } from './logger';

async function main(): Promise<void> {
  const config = loadConfig();
  await connectMongo(config.MONGO_URI);
  await seedAdmin(config.ADMIN_USERNAME, config.ADMIN_PASSWORD);

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'HTTP server listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => logger.info('HTTP server closed'));
    try {
      await disconnectMongo();
    } catch (err) {
      logger.error({ err }, 'Error during Mongo disconnect');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
