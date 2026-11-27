import { z } from 'zod';

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1)
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(1),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().nonnegative(),
  minimumPurchase: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  active: z.boolean().optional()
});
