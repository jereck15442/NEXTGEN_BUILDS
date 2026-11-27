import { Coupon } from '../models/Coupon.js';

export const couponRepository = {
  findByCode(code) {
    return Coupon.findOne({ code: code.toUpperCase() });
  },
  findActiveByCode(code) {
    return Coupon.findOne({ code: code.toUpperCase(), active: true });
  },
  create(data) {
    return Coupon.create(data);
  },
  incrementUsage(coupon, session) {
    const usageLimit = coupon.usageLimit == null ? Number.MAX_SAFE_INTEGER : coupon.usageLimit;
    return Coupon.updateOne(
      { _id: coupon._id, usedCount: { $lt: usageLimit } },
      { $inc: { usedCount: 1 } },
      { session }
    );
  }
};
