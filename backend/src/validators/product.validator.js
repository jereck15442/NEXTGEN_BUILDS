import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

export const PRODUCT_CATEGORIES = ['CPU', 'motherboard', 'GPU', 'RAM', 'storage', 'PSU', 'case'];

export const productListQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.string().trim().min(1).optional()
});

const productFields = {
  name: z.string().trim().min(1),
  description: z.string().optional(),
  category: z.enum(PRODUCT_CATEGORIES),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  specifications: z.record(z.string(), z.any()).optional()
};

export const createProductSchema = z.object(productFields);
export const updateProductSchema = z.object(productFields).partial();
