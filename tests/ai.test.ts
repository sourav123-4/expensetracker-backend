import request from 'supertest';
import { createApp } from '../src/app';
import { registerAndLogin } from './helpers';
import { mockIsGeminiConfigured, mockParseTransactionText } from './setup';

const app = createApp();

describe('POST /ai/parse-transaction', () => {
  let auth: { accessToken: string };
  const authed = () => ({ Authorization: `Bearer ${auth.accessToken}` });

  beforeEach(async () => {
    auth = await registerAndLogin(app);
  });

  afterEach(() => {
    mockIsGeminiConfigured.mockReturnValue(false);
    mockParseTransactionText.mockReset();
  });

  it('400s when Gemini is not configured', async () => {
    const res = await request(app)
      .post('/api/v1/ai/parse-transaction')
      .set(authed())
      .send({ text: 'coffee 150 UPI' })
      .expect(400);
    expect(res.body.message).toMatch(/not configured/i);
  });

  it('returns the parsed draft expense when configured', async () => {
    mockIsGeminiConfigured.mockReturnValue(true);
    mockParseTransactionText.mockResolvedValue({
      type: 'expense',
      title: 'Coffee',
      amount: 150,
      category: 'Food',
      paymentMethod: 'UPI',
    });

    const res = await request(app)
      .post('/api/v1/ai/parse-transaction')
      .set(authed())
      .send({ text: 'coffee 150 UPI' })
      .expect(200);
    expect(res.body.data.transaction).toEqual({
      type: 'expense',
      title: 'Coffee',
      amount: 150,
      category: 'Food',
      paymentMethod: 'UPI',
    });
  });

  it('returns the parsed draft income when configured', async () => {
    mockIsGeminiConfigured.mockReturnValue(true);
    mockParseTransactionText.mockResolvedValue({
      type: 'income',
      title: 'Salary',
      amount: 5000,
      source: 'Salary',
    });

    const res = await request(app)
      .post('/api/v1/ai/parse-transaction')
      .set(authed())
      .send({ text: 'got 5000 salary' })
      .expect(200);
    expect(res.body.data.transaction.type).toBe('income');
    expect(res.body.data.transaction.source).toBe('Salary');
  });

  it('400s when Gemini cannot extract a transaction', async () => {
    mockIsGeminiConfigured.mockReturnValue(true);
    mockParseTransactionText.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/ai/parse-transaction')
      .set(authed())
      .send({ text: 'hello there' })
      .expect(400);
    expect(res.body.message).toMatch(/couldn't understand/i);
  });

  it('rejects a too-short text', async () => {
    await request(app).post('/api/v1/ai/parse-transaction').set(authed()).send({ text: 'ab' }).expect(400);
  });

  it('requires auth', async () => {
    await request(app).post('/api/v1/ai/parse-transaction').send({ text: 'coffee 150' }).expect(401);
  });
});
