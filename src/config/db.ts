import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

/**
 * Connects to MongoDB. In tests, the URI is provided by mongodb-memory-server
 * via the `uri` argument instead of the environment.
 */
export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<void> {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
