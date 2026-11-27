import { describe, expect, it } from 'vitest';
import { validateCoupon } from '../../src/services/coupon.service.js';

const baseCoupon = {
  active: true,
  validFrom: new Date('2026-01-01'),
  validUntil: new Date('2026-12-31'),
  minimumPurchase: 1000,
  usageLimit: 2,
  usedCount: 0
};

describe('coupon eligibility', () => {
  it('accepts an active coupon within its window', () => {
    expect(validateCoupon(baseCoupon, 1500, new Date('2026-06-01')).valid).toBe(true);
  });

  it('rejects inactive and expired coupons', () => {
    expect(validateCoupon({ ...baseCoupon, active: false }, 1500, new Date('2026-06-01')).valid).toBe(false);
    expect(validateCoupon(baseCoupon, 1500, new Date('2027-01-01')).valid).toBe(false);
  });

  it('rejects carts below the minimum purchase and exhausted coupons', () => {
    expect(validateCoupon(baseCoupon, 500, new Date('2026-06-01'))).toEqual({
      valid: false,
      message: 'Coupon not eligible'
    });
    expect(validateCoupon({ ...baseCoupon, usedCount: 2 }, 1500, new Date('2026-06-01')).valid).toBe(false);
  });
});
