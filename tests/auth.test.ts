import { OAuth2Client } from 'google-auth-library';
import request from 'supertest';
import { createApp } from '../src/app';
import { PasswordReset } from '../src/models/PasswordReset';
import { authService } from '../src/services/authService';
import { emailService } from '../src/services/emailService';
import { mockVerifyIdToken } from './setup';
import { registerAndLogin, TEST_USER } from './helpers';

/** Stubs the Google verification round-trip so tests never call Google's servers. */
function mockGooglePayload(
  payload: Partial<{ email: string; email_verified: boolean; name: string }> | null,
) {
  // `verifyIdToken` is overloaded, which defeats jest.spyOn's return-type
  // inference — cast to the generic SpyInstance to mock a plain resolved value.
  const spy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken') as jest.SpyInstance;
  return spy.mockResolvedValue({ getPayload: () => payload });
}

const app = createApp();

describe('Auth', () => {
  describe('POST /auth/register', () => {
    it('creates an account and returns a token pair', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(TEST_USER).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
    });

    it('rejects a duplicate email with 409', async () => {
      await request(app).post('/api/v1/auth/register').send(TEST_USER).expect(201);
      await request(app).post('/api/v1/auth/register').send(TEST_USER).expect(409);
    });

    it('rejects invalid input with field errors', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'A', email: 'nope', password: 'short' })
        .expect(400);

      expect(res.body.errors).toMatchObject({
        name: expect.any(Array),
        email: expect.any(Array),
        password: expect.any(Array),
      });
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(TEST_USER).expect(201);
    });

    it('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      expect(res.body.data.accessToken).toEqual(expect.any(String));
    });

    it('returns the same 401 for wrong password and unknown email', async () => {
      const wrongPass = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'wrong-password' })
        .expect(401);
      const unknown = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@expenseflow.app', password: 'whatever123' })
        .expect(401);

      expect(wrongPass.body.message).toBe(unknown.body.message);
    });
  });

  describe('POST /auth/google', () => {
    it('creates a new passwordless account on first sign-in', async () => {
      mockGooglePayload({ email: 'googler@expenseflow.app', email_verified: true, name: 'Googler' });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(200);

      expect(res.body.data.user.email).toBe('googler@expenseflow.app');
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.accessToken).toEqual(expect.any(String));
    });

    it('logs into an existing account by email instead of duplicating it', async () => {
      await request(app).post('/api/v1/auth/register').send(TEST_USER).expect(201);
      mockGooglePayload({ email: TEST_USER.email, email_verified: true, name: TEST_USER.name });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(200);

      expect(res.body.data.user.email).toBe(TEST_USER.email);

      const { User } = await import('../src/models/User');
      expect(await User.countDocuments({ email: TEST_USER.email })).toBe(1);
    });

    it('rejects an unverified Google email', async () => {
      mockGooglePayload({ email: 'sneaky@expenseflow.app', email_verified: false });

      await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(401);
    });

    it('rejects a token Google fails to verify', async () => {
      const spy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken') as jest.SpyInstance;
      spy.mockRejectedValue(new Error('bad token'));

      await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(401);
    });
  });

  describe('POST /auth/phone', () => {
    it('creates a new passwordless, emailless account on first sign-in', async () => {
      mockVerifyIdToken.mockResolvedValue({ phone_number: '+15551234567' });

      const res = await request(app)
        .post('/api/v1/auth/phone')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(200);

      expect(res.body.data.user.phone).toBe('+15551234567');
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.accessToken).toEqual(expect.any(String));
    });

    it('logs into an existing account by phone instead of duplicating it', async () => {
      mockVerifyIdToken.mockResolvedValue({ phone_number: '+15551234567' });
      await request(app)
        .post('/api/v1/auth/phone')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(200);

      const res = await request(app)
        .post('/api/v1/auth/phone')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(200);
      expect(res.body.data.user.phone).toBe('+15551234567');

      const { User } = await import('../src/models/User');
      expect(await User.countDocuments({ phone: '+15551234567' })).toBe(1);
    });

    it('rejects a token with no phone number claim', async () => {
      mockVerifyIdToken.mockResolvedValue({});

      await request(app)
        .post('/api/v1/auth/phone')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(401);
    });

    it('rejects a token Firebase fails to verify', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('bad token'));

      await request(app)
        .post('/api/v1/auth/phone')
        .send({ idToken: 'fake-but-long-enough-token' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and invalidates the old one', async () => {
      const { refreshToken } = await registerAndLogin(app);

      const first = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(first.body.data.refreshToken).not.toBe(refreshToken);

      // Reusing the rotated (now revoked) token must fail
      await request(app).post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
    });

    it('revokes the whole session family on reuse', async () => {
      const { refreshToken } = await registerAndLogin(app);

      const first = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      // Reuse the old token (simulated theft)…
      await request(app).post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
      // …which must also kill the legitimately-rotated token
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.body.data.refreshToken })
        .expect(401);
    });
  });

  describe('protected routes', () => {
    it('GET /auth/me returns the profile with a valid token', async () => {
      const { accessToken } = await registerAndLogin(app);
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data.user.email).toBe(TEST_USER.email);
    });

    it('rejects a missing or malformed token', async () => {
      await request(app).get('/api/v1/auth/me').expect(401);
      await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer nope').expect(401);
    });
  });

  describe('password reset flow', () => {
    it('completes forgot → verify-otp → reset and invalidates old sessions', async () => {
      const { refreshToken } = await registerAndLogin(app);

      // Capture the OTP instead of sending mail
      let sentOtp = '';
      jest.spyOn(emailService, 'sendOtp').mockImplementation(async (_to, otp) => {
        sentOtp = otp;
      });

      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: TEST_USER.email })
        .expect(200);
      expect(sentOtp).toMatch(/^\d{6}$/);

      const verify = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: TEST_USER.email, otp: sentOtp })
        .expect(200);
      const { resetToken } = verify.body.data;

      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ email: TEST_USER.email, resetToken, newPassword: 'brand-new-pass1' })
        .expect(200);

      // Old refresh token is dead; new password works, old one doesn't
      await request(app).post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(401);
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'brand-new-pass1' })
        .expect(200);
    });

    it('locks the OTP after too many wrong attempts', async () => {
      await registerAndLogin(app);
      jest.spyOn(emailService, 'sendOtp').mockResolvedValue();

      await authService.forgotPassword(TEST_USER.email);
      const resetDoc = await PasswordReset.findOne().exec();
      expect(resetDoc).not.toBeNull();

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({ email: TEST_USER.email, otp: '000000' })
          .expect(400);
      }
      // Sixth attempt hits the lockout
      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: TEST_USER.email, otp: '000000' })
        .expect(429);
    });

    it('does not reveal whether an email exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost@expenseflow.app' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });
});
