import { Express } from 'express';
import request from 'supertest';

export const TEST_USER = {
  name: 'Test User',
  email: 'test@expenseflow.app',
  password: 'sup3r-secret!',
};

/** Registers a fresh user and returns their token pair. */
export async function registerAndLogin(
  app: Express,
  overrides: Partial<typeof TEST_USER> = {},
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ ...TEST_USER, ...overrides })
    .expect(201);

  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
    userId: res.body.data.user._id ?? res.body.data.user.id,
  };
}
