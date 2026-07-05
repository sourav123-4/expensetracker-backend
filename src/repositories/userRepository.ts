import { IUser, User } from '../models/User';

/**
 * Data-access layer for User. Services depend on this interface rather than
 * Mongoose directly, keeping business logic unit-testable.
 */
export const userRepository = {
  create(data: { name: string; email: string; password: string }): Promise<IUser> {
    return User.create(data);
  },

  /** Google accounts have no password — they authenticate via ID token only. */
  createGoogleUser(data: { name: string; email: string }): Promise<IUser> {
    return User.create({ ...data, authProvider: 'google' });
  },

  /** Phone accounts have no password or email — they authenticate via ID token only. */
  createPhoneUser(data: { name: string; phone: string }): Promise<IUser> {
    return User.create({ ...data, authProvider: 'phone' });
  },

  findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).exec();
  },

  findByPhone(phone: string): Promise<IUser | null> {
    return User.findOne({ phone }).exec();
  },

  /** Includes the password hash — for login/credential checks only. */
  findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).select('+password').exec();
  },

  findById(id: string): Promise<IUser | null> {
    return User.findById(id).exec();
  },

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password').exec();
    if (!user) return;
    user.password = newPassword; // pre-save hook re-hashes
    await user.save();
  },
};
