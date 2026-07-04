import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';

async function main(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`ExpenseFlow API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`Swagger docs at http://localhost:${env.PORT}${env.API_PREFIX}/docs`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => process.exit(0));
    // Force-exit if connections refuse to drain
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(`Fatal startup error: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});
