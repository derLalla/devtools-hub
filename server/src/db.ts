import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectMongo(uri: string, retries = 10, delayMs = 2000): Promise<typeof mongoose> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      logger.info({ attempt }, 'Connected to MongoDB');
      return mongoose;
    } catch (err) {
      lastErr = err;
      logger.warn({ attempt, retries }, 'MongoDB connection failed, retrying');
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to connect to MongoDB');
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
