import winston from 'winston';
import { isProduction, isTest } from './env';

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  silent: isTest,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});

export const morganStream = {
  write: (message: string) => logger.info(message.trim()),
};
