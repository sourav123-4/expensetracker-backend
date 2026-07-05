import request from 'supertest';
import { createApp } from '../src/app';
import { registerAndLogin } from './helpers';
import { mockIsGeminiConfigured, mockSuggestExpenseCategory } from './setup';

const app = createApp();

const sampleExpense = {
  title: 'Grocery run',
  amount: 1250.5,
  category: 'Food',
  paymentMethod: 'UPI',
  description: 'Weekly groceries',
  tags: ['groceries', 'weekly'],
  date: '2026-07-01T10:00:00.000Z',
};

describe('Expenses', () => {
  let auth: { accessToken: string };

  beforeEach(async () => {
    auth = await registerAndLogin(app);
  });

  const authed = () => ({ Authorization: `Bearer ${auth.accessToken}` });

  describe('POST /expenses', () => {
    it('creates an expense', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set(authed())
        .send(sampleExpense)
        .expect(201);

      expect(res.body.data.expense).toMatchObject({
        title: 'Grocery run',
        amount: 1250.5,
        category: 'Food',
        paymentMethod: 'UPI',
        isRecurring: false,
      });
    });

    it('rejects a non-positive amount and unknown category', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set(authed())
        .send({ ...sampleExpense, amount: 0, category: 'Nope' })
        .expect(400);
      expect(res.body.errors).toHaveProperty('amount');
      expect(res.body.errors).toHaveProperty('category');
    });

    it('requires auth', async () => {
      await request(app).post('/api/v1/expenses').send(sampleExpense).expect(401);
    });
  });

  describe('POST /expenses/categorize', () => {
    afterEach(() => {
      mockIsGeminiConfigured.mockReturnValue(false);
      mockSuggestExpenseCategory.mockReset();
    });

    it('400s when Gemini is not configured', async () => {
      const res = await request(app)
        .post('/api/v1/expenses/categorize')
        .set(authed())
        .send({ title: 'Uber to airport' })
        .expect(400);
      expect(res.body.message).toMatch(/not configured/i);
    });

    it('returns the suggested category when configured', async () => {
      mockIsGeminiConfigured.mockReturnValue(true);
      mockSuggestExpenseCategory.mockResolvedValue('Travel');

      const res = await request(app)
        .post('/api/v1/expenses/categorize')
        .set(authed())
        .send({ title: 'Uber to airport' })
        .expect(200);
      expect(res.body.data.category).toBe('Travel');
      expect(mockSuggestExpenseCategory).toHaveBeenCalledWith('Uber to airport');
    });

    it('rejects a too-short title', async () => {
      await request(app)
        .post('/api/v1/expenses/categorize')
        .set(authed())
        .send({ title: 'a' })
        .expect(400);
    });

    it('requires auth', async () => {
      await request(app)
        .post('/api/v1/expenses/categorize')
        .send({ title: 'Uber to airport' })
        .expect(401);
    });
  });

  describe('GET /expenses (list)', () => {
    beforeEach(async () => {
      const base = { paymentMethod: 'UPI', description: '', tags: [] };
      const rows = [
        { ...base, title: 'Groceries', amount: 500, category: 'Food', date: '2026-07-01' },
        { ...base, title: 'Petrol', amount: 2000, category: 'Fuel', date: '2026-07-02' },
        { ...base, title: 'Movie night', amount: 800, category: 'Entertainment', date: '2026-07-03' },
        { ...base, title: 'Pharmacy', amount: 300, category: 'Medicine', date: '2026-06-15' },
      ];
      for (const row of rows) {
        await request(app).post('/api/v1/expenses').set(authed()).send(row).expect(201);
      }
    });

    it('paginates with meta', async () => {
      const res = await request(app)
        .get('/api/v1/expenses?page=1&limit=2')
        .set(authed())
        .expect(200);

      expect(res.body.data.expenses).toHaveLength(2);
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        totalItems: 4,
        totalPages: 2,
        hasNextPage: true,
      });
    });

    it('filters by category and date range', async () => {
      const res = await request(app)
        .get('/api/v1/expenses?category=Food&dateFrom=2026-07-01&dateTo=2026-07-31')
        .set(authed())
        .expect(200);
      expect(res.body.data.expenses).toHaveLength(1);
      expect(res.body.data.expenses[0].title).toBe('Groceries');
    });

    it('searches partial words across title', async () => {
      const res = await request(app).get('/api/v1/expenses?q=groc').set(authed()).expect(200);
      expect(res.body.data.expenses).toHaveLength(1);
      expect(res.body.data.expenses[0].title).toBe('Groceries');
    });

    it('sorts by amount ascending', async () => {
      const res = await request(app)
        .get('/api/v1/expenses?sortBy=amount&order=asc')
        .set(authed())
        .expect(200);
      const amounts = res.body.data.expenses.map((e: { amount: number }) => e.amount);
      expect(amounts).toEqual([300, 500, 800, 2000]);
    });

    it('never leaks another user\'s data', async () => {
      const other = await registerAndLogin(app, { email: 'other@expenseflow.app' });
      const res = await request(app)
        .get('/api/v1/expenses')
        .set({ Authorization: `Bearer ${other.accessToken}` })
        .expect(200);
      expect(res.body.data.expenses).toHaveLength(0);
    });
  });

  describe('GET/PATCH/DELETE /expenses/:id', () => {
    let expenseId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set(authed())
        .send(sampleExpense)
        .expect(201);
      expenseId = res.body.data.expense._id;
    });

    it('gets one by id', async () => {
      const res = await request(app).get(`/api/v1/expenses/${expenseId}`).set(authed()).expect(200);
      expect(res.body.data.expense.title).toBe('Grocery run');
    });

    it('updates fields', async () => {
      const res = await request(app)
        .patch(`/api/v1/expenses/${expenseId}`)
        .set(authed())
        .send({ amount: 999, category: 'Shopping' })
        .expect(200);
      expect(res.body.data.expense.amount).toBe(999);
      expect(res.body.data.expense.category).toBe('Shopping');
    });

    it('deletes and then 404s', async () => {
      await request(app).delete(`/api/v1/expenses/${expenseId}`).set(authed()).expect(200);
      await request(app).get(`/api/v1/expenses/${expenseId}`).set(authed()).expect(404);
    });

    it('404s for another user\'s expense (no cross-tenant access)', async () => {
      const other = await registerAndLogin(app, { email: 'other@expenseflow.app' });
      await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set({ Authorization: `Bearer ${other.accessToken}` })
        .expect(404);
    });

    it('rejects a malformed id', async () => {
      await request(app).get('/api/v1/expenses/not-an-id').set(authed()).expect(400);
    });
  });
});
