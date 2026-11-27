import { Router } from 'express';
import * as couponController from '../controllers/coupon.controller.js';
import { loadUser, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { applyCouponSchema, createCouponSchema } from '../validators/coupon.validator.js';

export const couponRoutes = Router();

couponRoutes.post('/apply', requireAuth, loadUser, validate({ body: applyCouponSchema }), couponController.apply);
couponRoutes.post('/', requireAuth, loadUser, requireAdmin, validate({ body: createCouponSchema }), couponController.create);
