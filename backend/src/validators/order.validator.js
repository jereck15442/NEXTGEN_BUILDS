import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

export const orderListQuerySchema = paginationQuerySchema;

export const updateFulfillmentSchema = z.object({
  fulfillmentStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
});
