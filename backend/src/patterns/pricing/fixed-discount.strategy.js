import { DiscountStrategy } from './discount-strategy.js';

export class FixedDiscountStrategy extends DiscountStrategy {
  calculate(_subtotal, value) {
    return value;
  }
}
