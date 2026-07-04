import { Document, Model, Schema, Types, model } from 'mongoose';

/**
 * Forgot-password flow state. `otpHash` is the bcrypt hash of the 6-digit OTP;
 * after verification `resetTokenHash` is set and the OTP can no longer be used.
 * Single-use: the document is deleted when the password is reset.
 */
export interface IPasswordReset extends Document {
  user: Types.ObjectId;
  otpHash: string;
  resetTokenHash: string | null;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    otpHash: { type: String, required: true },
    resetTokenHash: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset: Model<IPasswordReset> = model<IPasswordReset>(
  'PasswordReset',
  passwordResetSchema,
);
