import { asyncHandler } from '../utils/async.js';
import * as cartService from '../services/cart.service.js';

export const get = asyncHandler(async (req, res) => {
  res.json(await cartService.getCart(req.user._id));
});

export const add = asyncHandler(async (req, res) => {
  res.status(201).json(await cartService.addItem(req.user._id, req.body));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await cartService.updateItem(req.user._id, req.params.productId, req.body.quantity));
});

export const remove = asyncHandler(async (req, res) => {
  res.json(await cartService.removeItem(req.user._id, req.params.productId));
});
