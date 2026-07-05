import { EXPENSE_CATEGORIES, ExpenseCategory } from '../types/domain';
import { env } from './env';
import { logger } from './logger';

/**
 * Optional Gemini-powered category suggestion. Activates only when
 * GEMINI_API_KEY is set (free tier: https://aistudio.google.com/apikey) —
 * everything else no-ops so the API runs fine without it configured.
 */
export const isGeminiConfigured = (): boolean => env.GEMINI_API_KEY.trim().length > 0;

const MODEL = 'gemini-2.0-flash';

/** Asks Gemini which of our fixed categories best fits an expense title. Returns null on any failure. */
export async function suggestExpenseCategory(title: string): Promise<ExpenseCategory | null> {
  if (!isGeminiConfigured()) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Classify this expense title into exactly one category: "${title}"`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'text/x.enum',
            responseSchema: { type: 'STRING', enum: [...EXPENSE_CATEGORIES] },
          },
        }),
      },
    );

    if (!res.ok) {
      logger.error(`Gemini categorize request failed (${res.status})`);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return (EXPENSE_CATEGORIES as readonly string[]).includes(text ?? '')
      ? (text as ExpenseCategory)
      : null;
  } catch (err) {
    logger.error(`Gemini categorize request errored (${(err as Error).message})`);
    return null;
  }
}
