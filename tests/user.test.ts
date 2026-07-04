import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { registerAndLogin } from './helpers';

const app = createApp();

describe('Users', () => {
  let auth: { accessToken: string; userId: string };
  const authed = () => ({ Authorization: `Bearer ${auth.accessToken}` });

  beforeEach(async () => {
    auth = await registerAndLogin(app);
  });

  it('updates currency via PATCH /users/me', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(authed())
      .send({ currency: 'USD' })
      .expect(200);
    expect(res.body.data.user.currency).toBe('USD');
  });

  it('rejects an unsupported currency', async () => {
    await request(app).patch('/api/v1/users/me').set(authed()).send({ currency: 'XYZ' }).expect(400);
  });

  it('registers and unregisters an FCM token idempotently', async () => {
    const token = 'fcm-token-abcdefghijklmnopqrstuvwxyz';
    await request(app).put('/api/v1/users/me/fcm-token').set(authed()).send({ token }).expect(200);
    await request(app).put('/api/v1/users/me/fcm-token').set(authed()).send({ token }).expect(200);

    let user = await User.findById(auth.userId).exec();
    expect(user!.fcmTokens).toEqual([token]);

    await request(app).delete('/api/v1/users/me/fcm-token').set(authed()).send({ token }).expect(200);
    user = await User.findById(auth.userId).exec();
    expect(user!.fcmTokens).toEqual([]);
  });

  it('exports and re-imports account data (backup & restore round trip)', async () => {
    await request(app)
      .post('/api/v1/expenses')
      .set(authed())
      .send({ title: 'Coffee', amount: 250, category: 'Food' })
      .expect(201);
    await request(app)
      .post('/api/v1/income')
      .set(authed())
      .send({ title: 'Salary', amount: 50000, source: 'Salary' })
      .expect(201);

    const exported = await request(app).get('/api/v1/users/me/export').set(authed()).expect(200);
    const bundle = exported.body.data;
    expect(bundle.version).toBe(1);
    expect(bundle.expenses).toHaveLength(1);
    expect(bundle.income).toHaveLength(1);
    expect(bundle.expenses[0]._id).toBeUndefined();

    // Restore into a brand-new account
    const other = await registerAndLogin(app, { email: 'restore-target@expenseflow.app' });
    await request(app)
      .post('/api/v1/users/me/import')
      .set({ Authorization: `Bearer ${other.accessToken}` })
      .send(bundle)
      .expect(200);

    const list = await request(app)
      .get('/api/v1/expenses')
      .set({ Authorization: `Bearer ${other.accessToken}` })
      .expect(200);
    expect(list.body.data.expenses).toHaveLength(1);
    expect(list.body.data.expenses[0].title).toBe('Coffee');
  });

  it('reports zero sends for test-push when Firebase is unconfigured', async () => {
    const res = await request(app).post('/api/v1/users/me/test-push').set(authed()).expect(200);
    expect(res.body.data.sent).toBe(0);
  });
});
