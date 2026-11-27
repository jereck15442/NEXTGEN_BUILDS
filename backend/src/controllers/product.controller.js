import { asyncHandler } from '../utils/async.js';
import * as productService from '../services/product.service.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await productService.listProducts(req.query));
});

export const get = asyncHandler(async (req, res) => {
  res.json(await productService.getProduct(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await productService.createProduct(req.body));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await productService.updateProduct(req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  res.json(await productService.deactivateProduct(req.params.id));
});

export const lowStock = asyncHandler(async (_req, res) => {
  res.json(await productService.listLowStock());
});
