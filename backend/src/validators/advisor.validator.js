import { z } from 'zod';

export const advisorSchema = z.object({
  budget: z.number().positive().max(10_000_000),
  usage: z.string().trim().min(1).max(200)
});
