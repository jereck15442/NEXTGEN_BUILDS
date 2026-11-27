import { describe, expect, it } from 'vitest';
import { getDiscountStrategy } from '../../src/patterns/pricing/discount-strategy.factory.js';
import { clampDiscount } from '../../src/utils/money.js';

describe('pricing strategies', () => {
  it('calculates percentage discounts', () => {
    expect(getDiscountStrategy('percentage').calculate(5000, 10)).toBe(500);
  });

  it('calculates fixed discounts', () => {
    expect(getDiscountStrategy('fixed').calculate(5000, 750)).toBe(750);
  });

  it('clamps discounts to the subtotal', () => {
    expect(clampDiscount(5000, 7500)).toBe(5000);
    expect(clampDiscount(5000, -10)).toBe(0);
  });

  it('rejects unknown discount types', () => {
    expect(() => getDiscountStrategy('bogus')).toThrow('Unsupported discount type');
  });
});
