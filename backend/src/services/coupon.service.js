import { cartRepository } from '../repositories/cart.repository.js';
import { couponRepository } from '../repositories/coupon.repository.js';
import { isWithinWindow } from '../utils/dates.js';
import { unprocessable } from '../utils/errors.js';

export function validateCoupon(coupon, subtotal, now = new Date()) {
  if (!coupon || !coupon.active) return { valid: false, message: 'Invalid coupon' };
  if (!isWithinWindow(now, coupon.validFrom, coupon.validUntil)) return { valid: false, message: 'Invalid coupon' };
  if (coupon.minimumPurchase && subtotal < coupon.minimumPurchase) return { valid: false, message: 'Coupon not eligible' };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { valid: false, message: 'Coupon not eligible' };
  return { valid: true };
}

export async function applyCoupon(userId, code) {
  const coupon = await couponRepository.findActiveByCode(code);
  const now = new Date();
  if (!coupon || !isWithinWindow(now, coupon.validFrom, coupon.validUntil) ||
      (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)) {
    throw unprocessable('Invalid coupon');
  }

  const cart = await cartRepository.findByUser(userId);
  if (!cart) throw unprocessable('Cart is empty');

  await cartRepository.setCoupon(userId, coupon.code);
  return { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue };
}

export async function createCoupon(data) {
  if (data.validUntil <= data.validFrom) throw unprocessable('validUntil must be after validFrom');
  return couponRepository.create(data);
}
