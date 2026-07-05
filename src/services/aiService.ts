import { isGeminiConfigured, ParsedAiTransaction, parseTransactionText } from '../config/gemini';
import { ApiError } from '../utils/ApiError';

export const aiService = {
  async parseTransaction(text: string): Promise<ParsedAiTransaction> {
    if (!isGeminiConfigured()) {
      throw ApiError.badRequest('AI transaction parsing is not configured on this server');
    }
    const parsed = await parseTransactionText(text);
    if (!parsed) {
      throw ApiError.badRequest('Couldn\'t understand that — try including an amount, e.g. "coffee 150 UPI"');
    }
    return parsed;
  },
};
