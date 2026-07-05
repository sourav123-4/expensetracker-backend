import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  INCOME_SOURCES,
  IncomeSource,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../types/domain';
import { env } from './env';
import { logger } from './logger';

/**
 * Optional Gemini-powered features (category suggestion, free-text
 * transaction parsing, dashboard insights). Activate only when
 * GEMINI_API_KEY is set (free tier: https://aistudio.google.com/apikey) —
 * everything else no-ops so the API runs fine without it configured.
 */
export const isGeminiConfigured = (): boolean => env.GEMINI_API_KEY.trim().length > 0;

// gemini-2.0-flash has a 0-request free-tier quota on newly created API keys as of
// mid-2026 (Google moved the free tier to the 2.5 line) — 2.5-flash-lite is the
// cheapest/fastest model that still gets a real free-tier allowance.
const MODEL = 'gemini-2.5-flash-lite';

interface GenerateContentConfig {
  responseMimeType: string;
  responseSchema?: Record<string, unknown>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One shared call shape for every Gemini feature below — returns the raw text
 * part, or null on any failure. The free tier routinely returns transient 429
 * (per-minute quota) and 503 ("high demand") on the first try, so one retry
 * after a short delay turns most of those into a success instead of a
 * user-visible "couldn't understand that" for something that would have
 * worked half a second later.
 */
async function generateText(prompt: string, generationConfig: GenerateContentConfig): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(800);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        },
      );

      if (!res.ok) {
        logger.error(`Gemini request failed (${res.status})`);
        if ((res.status === 429 || res.status === 503) && attempt === 0) continue;
        return null;
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
    } catch (err) {
      logger.error(`Gemini request errored (${(err as Error).message})`);
      if (attempt === 0) continue;
      return null;
    }
  }
  return null;
}

/** Asks Gemini which of our fixed categories best fits an expense title. Returns null on any failure. */
export async function suggestExpenseCategory(title: string): Promise<ExpenseCategory | null> {
  if (!isGeminiConfigured()) return null;

  const text = await generateText(`Classify this expense title into exactly one category: "${title}"`, {
    responseMimeType: 'text/x.enum',
    responseSchema: { type: 'STRING', enum: [...EXPENSE_CATEGORIES] },
  });
  return (EXPENSE_CATEGORIES as readonly string[]).includes(text ?? '') ? (text as ExpenseCategory) : null;
}

export interface ParsedAiTransaction {
  type: 'expense' | 'income';
  title: string;
  amount: number;
  category?: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  source?: IncomeSource;
}

/**
 * Parses a free-text description ("coffee 150 UPI", "got 5000 salary") into a
 * draft transaction. Returns null if Gemini can't extract a sensible amount —
 * the caller then falls back to a blank form rather than a garbage prefill.
 */
export async function parseTransactionText(text: string): Promise<ParsedAiTransaction | null> {
  if (!isGeminiConfigured()) return null;

  const raw = await generateText(
    `Extract a single financial transaction from this text, written by an Indian user: "${text}". ` +
      'Decide whether it is money going out (expense) or money coming in (income).',
    {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['expense', 'income'] },
          title: { type: 'STRING', description: 'Short 2-4 word label, e.g. "Coffee", "Salary"' },
          amount: { type: 'NUMBER' },
          category: { type: 'STRING', enum: [...EXPENSE_CATEGORIES] },
          paymentMethod: { type: 'STRING', enum: [...PAYMENT_METHODS] },
          source: { type: 'STRING', enum: [...INCOME_SOURCES] },
        },
        required: ['type', 'title', 'amount'],
      },
    },
  );
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      (parsed.type !== 'expense' && parsed.type !== 'income') ||
      typeof parsed.title !== 'string' ||
      !parsed.title.trim() ||
      typeof parsed.amount !== 'number' ||
      !(parsed.amount > 0)
    ) {
      return null;
    }

    const result: ParsedAiTransaction = { type: parsed.type, title: parsed.title.trim(), amount: parsed.amount };
    if (parsed.type === 'expense') {
      result.category = (EXPENSE_CATEGORIES as readonly string[]).includes(parsed.category as string)
        ? (parsed.category as ExpenseCategory)
        : 'Others';
      result.paymentMethod = (PAYMENT_METHODS as readonly string[]).includes(parsed.paymentMethod as string)
        ? (parsed.paymentMethod as PaymentMethod)
        : 'Cash';
    } else {
      result.source = (INCOME_SOURCES as readonly string[]).includes(parsed.source as string)
        ? (parsed.source as IncomeSource)
        : 'Other';
    }
    return result;
  } catch (err) {
    logger.error(`Gemini parse-transaction returned unparsable JSON (${(err as Error).message})`);
    return null;
  }
}

export interface DashboardInsightInput {
  month: string;
  totalIncome: number;
  totalExpense: number;
  categoryBreakdown: Array<{ category: string; total: number }>;
  trend: Array<{ month: string; income: number; expense: number }>;
}

/** One short, human-readable observation about the month's spending. Returns null on any failure. */
export async function generateDashboardInsight(input: DashboardInsightInput): Promise<string | null> {
  if (!isGeminiConfigured()) return null;
  if (input.totalIncome === 0 && input.totalExpense === 0) return null;

  const prompt =
    `You are a personal finance assistant. Given this JSON summary of a user's month, ` +
    `write exactly ONE short, friendly sentence (max 140 characters, no emoji, no markdown) ` +
    `pointing out the single most useful observation (a trend, a category spike, or savings rate). ` +
    `Data: ${JSON.stringify(input)}`;

  const text = await generateText(prompt, { responseMimeType: 'text/plain' });
  if (!text) return null;
  return text.length > 200 ? null : text;
}
