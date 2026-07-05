import bcrypt from 'bcryptjs';
import { Document, Model, Schema, model } from 'mongoose';
import { env } from '../config/env';

export interface IUser extends Document {
  name: string;
  /** Absent for phone-only accounts — Firebase Phone Auth never provides an email. */
  email?: string;
  /** Absent unless the account was created (or later linked) via phone sign-in. */
  phone?: string;
  /** Absent for Google/phone-only accounts — they authenticate via ID token, never a password. */
  password?: string;
  /** How this account was created; 'google'/'phone' accounts skip password login entirely. */
  authProvider: 'local' | 'google' | 'phone';
  currency: string;
  /** FCM device registration tokens (one per installed device). */
  fcmTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Not required — phone-only accounts have no email. `sparse` lets many
    // docs omit it while still enforcing uniqueness among those that have one.
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    // select: false keeps the hash out of every query unless explicitly requested.
    // Not required at the schema level — Google/phone accounts never set one.
    password: { type: String, select: false },
    authProvider: { type: String, enum: ['local', 'google', 'phone'], default: 'local' },
    currency: { type: String, default: 'INR', maxlength: 8 },
    fcmTokens: { type: [String], default: [] },
  },
  { timestamps: true },
);

userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    next(new Error('An account needs either an email or a phone number'));
    return;
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.password;
    delete obj.__v;
    return obj;
  },
});

export const User: Model<IUser> = model<IUser>('User', userSchema);
