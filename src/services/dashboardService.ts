import { Types } from 'mongoose';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';

export interface CategorySlice {
  category: string;
  total: number;
  count: number;
}

export interface MonthPoint {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

export interface RecentTransaction {
  id: string;
  type: 'expense' | 'income';
  title: string;
  amount: number;
  category: string; // expense category or income source
  date: Date;
}

export interface DashboardSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryBreakdown: CategorySlice[];
  trend: MonthPoint[];
  recentTransactions: RecentTransaction[];
  // Reserved for v2 modules (EMI / Credit Card / Loan) — always present so the
  // client contract doesn't change when those ship.
  upcomingEmi: null;
  creditCardDue: null;
  loanOutstanding: null;
  savingsProgress: null;
}

function monthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  return { start, end };
}

function formatMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const dashboardService = {
  /**
   * One round trip per collection, all aggregation done in MongoDB:
   *  - month totals + category breakdown for the requested month
   *  - income/expense totals for each of the trailing 6 months
   *  - 5 most recent transactions across both collections
   */
  async getSummary(userId: string, month: string): Promise<DashboardSummary> {
    const user = new Types.ObjectId(userId);
    const { start, end } = monthRange(month);

    // Trailing 6 months window (inclusive of the requested month)
    const trendStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 5, 1));

    const [expenseAgg, incomeAgg, recentExpenses, recentIncome] = await Promise.all([
      Expense.aggregate<{
        monthTotals: { total: number }[];
        categories: { _id: string; total: number; count: number }[];
        trend: { _id: string; total: number }[];
      }>([
        { $match: { user, date: { $gte: trendStart, $lt: end } } },
        {
          $facet: {
            monthTotals: [
              { $match: { date: { $gte: start, $lt: end } } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ],
            categories: [
              { $match: { date: { $gte: start, $lt: end } } },
              { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
              { $sort: { total: -1 } },
            ],
            trend: [
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                  total: { $sum: '$amount' },
                },
              },
            ],
          },
        },
      ]),
      Income.aggregate<{
        monthTotals: { total: number }[];
        trend: { _id: string; total: number }[];
      }>([
        { $match: { user, date: { $gte: trendStart, $lt: end } } },
        {
          $facet: {
            monthTotals: [
              { $match: { date: { $gte: start, $lt: end } } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ],
            trend: [
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                  total: { $sum: '$amount' },
                },
              },
            ],
          },
        },
      ]),
      Expense.find({ user }).sort({ date: -1, _id: -1 }).limit(5).exec(),
      Income.find({ user }).sort({ date: -1, _id: -1 }).limit(5).exec(),
    ]);

    const exp = expenseAgg[0];
    const inc = incomeAgg[0];

    const totalExpense = exp.monthTotals[0]?.total ?? 0;
    const totalIncome = inc.monthTotals[0]?.total ?? 0;

    const expenseTrendMap = new Map(exp.trend.map((t) => [t._id, t.total]));
    const incomeTrendMap = new Map(inc.trend.map((t) => [t._id, t.total]));

    const trend: MonthPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - i, 1));
      const key = formatMonth(d);
      trend.push({
        month: key,
        income: incomeTrendMap.get(key) ?? 0,
        expense: expenseTrendMap.get(key) ?? 0,
      });
    }

    const recentTransactions: RecentTransaction[] = [
      ...recentExpenses.map((e) => ({
        id: e.id as string,
        type: 'expense' as const,
        title: e.title,
        amount: e.amount,
        category: e.category,
        date: e.date,
      })),
      ...recentIncome.map((i) => ({
        id: i.id as string,
        type: 'income' as const,
        title: i.title,
        amount: i.amount,
        category: i.source,
        date: i.date,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    return {
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categoryBreakdown: exp.categories.map((c) => ({
        category: c._id,
        total: c.total,
        count: c.count,
      })),
      trend,
      recentTransactions,
      upcomingEmi: null,
      creditCardDue: null,
      loanOutstanding: null,
      savingsProgress: null,
    };
  },
};
