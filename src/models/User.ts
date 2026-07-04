import bcrypt from 'bcryptjs';
import { Document, Model, Schema, model } from 'mongoose';
import { env } from '../config/env';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // select: false keeps the hash out of every query unless explicitly requested
    password: { type: String, required: true, select: false },
    currency: { type: String, default: 'INR', maxlength: 8 },
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
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
