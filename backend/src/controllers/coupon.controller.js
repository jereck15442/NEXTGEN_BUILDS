import { asyncHandler } from '../utils/async.js';
import * as couponService from '../services/coupon.service.js';

export const apply = asyncHandler(async (req, res) => {
  res.json(await couponService.applyCoupon(req.user._id, req.body.code));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await couponService.createCoupon(req.body));
});
