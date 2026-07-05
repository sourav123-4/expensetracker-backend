import request from 'supertest';
import { createApp } from '../src/app';
import { registerAndLogin } from './helpers';
import { mockGenerateDashboardInsight, mockIsGeminiConfigured } from './setup';

const app = createApp();

describe('Income + Dashboard', () => {
  let auth: { accessToken: string };
  const authed = () => ({ Authorization: `Bearer ${auth.accessToken}` });

  beforeEach(async () => {
    auth = await registerAndLogin(app);
  });

  it('supports income CRUD', async () => {
    const created = await request(app)
      .post('/api/v1/income')
      .set(authed())
      .send({ title: 'July salary', amount: 85000, source: 'Salary', date: '2026-07-01' })
      .expect(201);
    const id = created.body.data.income._id;

    const updated = await request(app)
      .patch(`/api/v1/income/${id}`)
      .set(authed())
      .send({ amount: 90000 })
      .expect(200);
    expect(updated.body.data.income.amount).toBe(90000);

    const list = await request(app).get('/api/v1/income').set(authed()).expect(200);
    expect(list.body.data.income).toHaveLength(1);

    await request(app).delete(`/api/v1/income/${id}`).set(authed()).expect(200);
    await request(app).get(`/api/v1/income/${id}`).set(authed()).expect(404);
  });

  it('aggregates the monthly summary correctly', async () => {
    // July 2026: two expenses (Food 500, Fuel 1500), one income (5000)
    // June 2026: one expense (200) — must appear in trend but not July totals
    await request(app)
      .post('/api/v1/expenses')
      .set(authed())
      .send({ title: 'Meals', amount: 500, category: 'Food', date: '2026-07-05' })
      .expect(201);
    await request(app)
      .post('/api/v1/expenses')
      .set(authed())
      .send({ title: 'Petrol', amount: 1500, category: 'Fuel', date: '2026-07-10' })
      .expect(201);
    await request(app)
      .post('/api/v1/expenses')
      .set(authed())
      .send({ title: 'June misc', amount: 200, category: 'Others', date: '2026-06-20' })
      .expect(201);
    await request(app)
      .post('/api/v1/income')
      .set(authed())
      .send({ title: 'Salary', amount: 5000, source: 'Salary', date: '2026-07-01' })
      .expect(201);

    const res = await request(app)
      .get('/api/v1/dashboard/summary?month=2026-07')
      .set(authed())
      .expect(200);

    const summary = res.body.data;
    expect(summary.totalExpense).toBe(2000);
    expect(summary.totalIncome).toBe(5000);
    expect(summary.balance).toBe(3000);

    // Category breakdown sorted by total desc
    expect(summary.categoryBreakdown).toEqual([
      { category: 'Fuel', total: 1500, count: 1 },
      { category: 'Food', total: 500, count: 1 },
    ]);

    // 6-month trend ends at the requested month and includes June's expense
    expect(summary.trend).toHaveLength(6);
    expect(summary.trend[5]).toEqual({ month: '2026-07', income: 5000, expense: 2000 });
    expect(summary.trend[4]).toEqual({ month: '2026-06', income: 0, expense: 200 });

    // Most recent transactions across both collections, newest first
    expect(summary.recentTransactions.map((t: { title: string }) => t.title)).toEqual([
      'Petrol',
      'Meals',
      'Salary',
      'June misc',
    ]);
  });

  it('returns an empty summary for a month with no data', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary?month=2020-01')
      .set(authed())
      .expect(200);
    expect(res.body.data).toMatchObject({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      categoryBreakdown: [],
      recentTransactions: [],
    });
  });

  it('rejects a malformed month', async () => {
    await request(app).get('/api/v1/dashboard/summary?month=2026-13').set(authed()).expect(400);
  });

  describe('GET /dashboard/insight', () => {
    afterEach(() => {
      mockIsGeminiConfigured.mockReturnValue(false);
      mockGenerateDashboardInsight.mockReset();
    });

    it('returns null when Gemini is not configured', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/insight?month=2026-07')
        .set(authed())
        .expect(200);
      expect(res.body.data.insight).toBeNull();
    });

    it('returns the generated sentence when configured', async () => {
      mockIsGeminiConfigured.mockReturnValue(true);
      mockGenerateDashboardInsight.mockResolvedValue('You spent 22% more on Fuel this month.');

      const res = await request(app)
        .get('/api/v1/dashboard/insight?month=2026-07')
        .set(authed())
        .expect(200);
      expect(res.body.data.insight).toBe('You spent 22% more on Fuel this month.');
    });
  });
});
