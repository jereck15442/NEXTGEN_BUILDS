import { z } from 'zod';

export const paymentReturnParamsSchema = z.object({
  result: z.enum(['success', 'failure', 'cancel'])
});
