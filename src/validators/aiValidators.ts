import { z } from 'zod';

export const parseTransactionSchema = z.object({
  text: z.string().trim().min(3, 'Describe the transaction in a few words').max(300),
});
