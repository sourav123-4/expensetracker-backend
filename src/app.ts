import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env, isTest } from './config/env';
import { morganStream } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiRateLimiter } from './middlewares/rateLimiter';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!isTest) {
    app.use(morgan('tiny', { stream: morganStream }));
  }

  app.use(env.API_PREFIX, apiRateLimiter, apiRouter);
  app.use(
    `${env.API_PREFIX}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCssUrl: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
      customJs: [
        'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
        'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
      ],
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
