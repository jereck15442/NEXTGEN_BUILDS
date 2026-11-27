import { asyncHandler } from '../utils/async.js';
import * as orderService from '../services/order.service.js';

export const create = asyncHandler(async (req, res) => {
  const { addressId } = req.body ?? {};
  const { order, payment } = await orderService.createOrder(req.user._id, addressId);
  res.status(201).json({ order, payment });
});

export const list = asyncHandler(async (req, res) => {
  res.json(await orderService.listOrders(req.user._id, req.query));
});

export const adminList = asyncHandler(async (req, res) => {
  res.json(await orderService.listAllOrders(req.query));
});

export const get = asyncHandler(async (req, res) => {
  res.json(await orderService.getOrder(req.params.id, req.user));
});

export const cancel = asyncHandler(async (req, res) => {
  res.json(await orderService.cancelOrder(req.params.id, req.user._id));
});

export const updateStatus = asyncHandler(async (req, res) => {
  res.json(await orderService.updateFulfillmentStatus(req.params.id, req.body.fulfillmentStatus));
});
