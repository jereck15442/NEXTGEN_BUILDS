import { z } from 'zod';
import { objectIdSchema } from './common.validator.js';

export const addCartItemSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int().positive()
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive()
});

export const cartItemParamsSchema = z.object({ productId: objectIdSchema });
