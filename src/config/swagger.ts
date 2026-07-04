import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ExpenseFlow API',
      version: '1.0.0',
      description:
        'REST API for the ExpenseFlow personal finance app. All responses use the envelope `{ success, message, data, meta? }`.',
    },
    servers: [{ url: env.API_PREFIX, description: 'Versioned API root' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      { name: 'Auth', description: 'Registration, login, tokens, password reset' },
      { name: 'Expenses', description: 'Expense CRUD, search, filters, receipts' },
      { name: 'Income', description: 'Income CRUD' },
      { name: 'Dashboard', description: 'Aggregated monthly analytics' },
    ],
  },
  apis: ['src/routes/*.ts', 'dist/routes/*.js'],
});
