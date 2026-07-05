import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { getFirebaseAuth } from '../config/firebase';
import { PasswordReset } from '../models/PasswordReset';
import { IUser } from '../models/User';
import { userRepository } from '../repositories/userRepository';
import { ApiError } from '../utils/ApiError';
import { emailService } from './emailService';
import { TokenPair, tokenService } from './tokenService';

const googleClient = new OAuth2Client();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hashSha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

export interface AuthResult {
  user: IUser;
  tokens: TokenPair;
}

export const authService = {
  async register(input: { name: string; email: string; password: string }): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const user = await userRepository.create(input);
    const tokens = await tokenService.issuePair(user.id);
    return { user, tokens };
  },

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithPassword(input.email);
    // Identical error for unknown email and wrong password — no account enumeration
    if (!user || !(await user.comparePassword(input.password))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    const tokens = await tokenService.issuePair(user.id);
    return { user, tokens };
  },

  /**
   * Verifies a Google ID token (from the client's native Google Sign-In flow)
   * and issues our own session tokens — Google is just an identity check,
   * not a parallel session mechanism. Matches an existing account by email
   * (so a user who registered with a password can also sign in with Google
   * on the same address) or creates a new passwordless account.
   */
  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    if (!env.GOOGLE_WEB_CLIENT_ID) {
      throw ApiError.badRequest('Google sign-in is not configured on this server');
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_WEB_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw ApiError.unauthorized('Invalid Google credential');
    }

    if (!payload?.email || !payload.email_verified) {
      throw ApiError.unauthorized('Google account has no verified email');
    }

    let user = await userRepository.findByEmail(payload.email);
    if (!user) {
      user = await userRepository.createGoogleUser({
        name: payload.name ?? payload.email.split('@')[0],
        email: payload.email,
      });
    }

    const tokens = await tokenService.issuePair(user.id);
    return { user, tokens };
  },

  /**
   * Verifies a Firebase ID token issued after the client completes Firebase
   * Phone Auth's SMS OTP flow — the phone number itself was already proven by
   * Firebase; this just confirms the token is genuine and reads the number
   * off it. Matches an existing account by phone or creates a new one.
   */
  async loginWithPhone(idToken: string): Promise<AuthResult> {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      throw ApiError.badRequest('Phone sign-in is not configured on this server');
    }

    let decoded;
    try {
      decoded = await firebaseAuth.verifyIdToken(idToken);
    } catch {
      throw ApiError.unauthorized('Invalid phone credential');
    }

    const phone = decoded.phone_number;
    if (!phone) {
      throw ApiError.unauthorized('Token has no verified phone number');
    }

    let user = await userRepository.findByPhone(phone);
    if (!user) {
      user = await userRepository.createPhoneUser({ name: phone, phone });
    }

    const tokens = await tokenService.issuePair(user.id);
    return { user, tokens };
  },

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const { accessToken, refreshToken } = await tokenService.rotateRefreshToken(rawRefreshToken);
    return { accessToken, refreshToken };
  },

  async logout(rawRefreshToken: string): Promise<void> {
    await tokenService.revokeRefreshToken(rawRefreshToken);
  },

  /**
   * Issues a 6-digit OTP. Always resolves successfully even for unknown emails
   * (anti-enumeration); the OTP is only created/sent when the account exists.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) return;

    const otp = crypto.randomInt(100000, 1000000).toString();

    await PasswordReset.deleteMany({ user: user.id }).exec();
    await PasswordReset.create({
      user: user.id,
      otpHash: await bcrypt.hash(otp, 8),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    await emailService.sendOtp(email, otp);
  },

  /** Exchanges a valid OTP for a single-use reset token. */
  async verifyOtp(email: string, otp: string): Promise<{ resetToken: string }> {
    const user = await userRepository.findByEmail(email);
    const reset = user ? await PasswordReset.findOne({ user: user.id }).exec() : null;

    if (!user || !reset || reset.expiresAt.getTime() < Date.now()) {
      throw ApiError.badRequest('Invalid or expired code');
    }

    if (reset.attempts >= OTP_MAX_ATTEMPTS) {
      await reset.deleteOne();
      throw ApiError.tooManyRequests('Too many incorrect attempts; request a new code');
    }

    if (!(await bcrypt.compare(otp, reset.otpHash))) {
      reset.attempts += 1;
      await reset.save();
      throw ApiError.badRequest('Invalid or expired code');
    }

    const resetToken = crypto.randomBytes(32).toString('base64url');
    reset.resetTokenHash = hashSha256(resetToken);
    await reset.save();

    return { resetToken };
  },

  async resetPassword(email: string, resetToken: string, newPassword: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    const reset = user ? await PasswordReset.findOne({ user: user.id }).exec() : null;

    if (
      !user ||
      !reset ||
      !reset.resetTokenHash ||
      reset.expiresAt.getTime() < Date.now() ||
      reset.resetTokenHash !== hashSha256(resetToken)
    ) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    await userRepository.updatePassword(user.id, newPassword);
    await reset.deleteOne();
    // Password change invalidates every existing session
    await tokenService.revokeAllForUser(user.id);
  },

  async getProfile(userId: string): Promise<IUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },
};
