import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import { ApiError } from '../utils/ApiError';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AccessPayload {
  sub: string;
  type: 'access';
}

/** Refresh tokens are opaque random strings stored hashed (sha256) server-side. */
const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return value * unit;
}

export const tokenService = {
  signAccessToken(userId: string): string {
    const payload: AccessPayload = { sub: userId, type: 'access' };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    } as SignOptions);
  },

  verifyAccessToken(token: string): string {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
      if (decoded.type !== 'access' || !decoded.sub) throw new Error('bad payload');
      return decoded.sub;
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token');
    }
  },

  async issueRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(48).toString('base64url');
    await RefreshToken.create({
      user: userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN)),
    });
    return raw;
  },

  async issuePair(userId: string): Promise<TokenPair> {
    return {
      accessToken: this.signAccessToken(userId),
      refreshToken: await this.issueRefreshToken(userId),
    };
  },

  /**
   * Rotates a refresh token: validates, revokes the old one, issues a new pair.
   * Reuse of a revoked token revokes every session for that user (theft response).
   */
  async rotateRefreshToken(rawToken: string): Promise<TokenPair & { userId: string }> {
    const doc = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) }).exec();

    if (!doc) throw ApiError.unauthorized('Invalid refresh token');

    if (doc.revokedAt) {
      // Token reuse detected — kill the whole session family
      await RefreshToken.updateMany(
        { user: doc.user, revokedAt: null },
        { revokedAt: new Date() },
      ).exec();
      throw ApiError.unauthorized('Refresh token reuse detected; all sessions revoked');
    }

    if (doc.expiresAt.getTime() < Date.now()) {
      throw ApiError.unauthorized('Refresh token expired');
    }

    doc.revokedAt = new Date();
    await doc.save();

    const userId = doc.user.toString();
    const pair = await this.issuePair(userId);
    return { ...pair, userId };
  },

  async revokeRefreshToken(rawToken: string): Promise<void> {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(rawToken), revokedAt: null },
      { revokedAt: new Date() },
    ).exec();
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() }).exec();
  },
};
