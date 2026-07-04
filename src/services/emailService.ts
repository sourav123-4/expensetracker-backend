import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Pluggable email delivery. When SMTP is unconfigured (typical local dev),
 * OTPs are logged to the console instead of being sent — the flow stays testable
 * without external credentials.
 */
let transporter: Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export const emailService = {
  async sendOtp(to: string, otp: string): Promise<void> {
    if (!transporter) {
      logger.info(`[emailService] SMTP not configured — OTP for ${to}: ${otp}`);
      return;
    }
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: 'Your ExpenseFlow password reset code',
      text: `Your one-time code is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    });
  },
};
