import { Expense, IExpense } from '../models/Expense';
import { IIncome, Income } from '../models/Income';
import { IUser, User } from '../models/User';
import { ApiError } from '../utils/ApiError';

const MAX_FCM_TOKENS_PER_USER = 10;
const MAX_IMPORT_ROWS = 5000;

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  user: { name: string; email: string; currency: string };
  expenses: Partial<IExpense>[];
  income: Partial<IIncome>[];
}

export const userService = {
  async updateProfile(userId: string, patch: { name?: string; currency?: string }): Promise<IUser> {
    const user = await User.findByIdAndUpdate(userId, patch, { new: true, runValidators: true }).exec();
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  /** Registers a device's FCM token (idempotent; caps the per-user token list). */
  async addFcmToken(userId: string, token: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $pull: { fcmTokens: token } }).exec();
    await User.updateOne(
      { _id: userId },
      { $push: { fcmTokens: { $each: [token], $slice: -MAX_FCM_TOKENS_PER_USER } } },
    ).exec();
  },

  async removeFcmToken(userId: string, token: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $pull: { fcmTokens: token } }).exec();
  },

  /** Full-account data export — the "backup" side of backup & restore. */
  async exportData(userId: string): Promise<ExportBundle> {
    const [user, expenses, income] = await Promise.all([
      User.findById(userId).exec(),
      Expense.find({ user: userId }).sort({ date: -1 }).exec(),
      Income.find({ user: userId }).sort({ date: -1 }).exec(),
    ]);
    if (!user) throw ApiError.notFound('User not found');

    const strip = <T extends { toJSON(): unknown }>(docs: T[]) =>
      docs.map((d) => {
        const obj = d.toJSON() as Record<string, unknown>;
        delete obj._id;
        delete obj.user;
        delete obj.createdAt;
        delete obj.updatedAt;
        return obj;
      });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: { name: user.name, email: user.email, currency: user.currency },
      expenses: strip(expenses) as Partial<IExpense>[],
      income: strip(income) as Partial<IIncome>[],
    };
  },

  /**
   * Restore: bulk-inserts expenses/income from an export bundle into this
   * account. Rows are validated by the Mongoose schemas; the whole call is
   * rejected if the bundle shape is wrong (validators run per document).
   */
  async importData(
    userId: string,
    bundle: { expenses?: unknown[]; income?: unknown[] },
  ): Promise<{ expenses: number; income: number }> {
    const expenseRows = bundle.expenses ?? [];
    const incomeRows = bundle.income ?? [];

    if (expenseRows.length + incomeRows.length > MAX_IMPORT_ROWS) {
      throw ApiError.badRequest(`Import is limited to ${MAX_IMPORT_ROWS} rows`);
    }

    const expenses = await Expense.insertMany(
      expenseRows.map((row) => ({ ...(row as object), user: userId, _id: undefined })),
      { ordered: false },
    );
    const income = await Income.insertMany(
      incomeRows.map((row) => ({ ...(row as object), user: userId, _id: undefined })),
      { ordered: false },
    );

    return { expenses: expenses.length, income: income.length };
  },
};
