import { DiscountStrategy } from './discount-strategy.js';

export class PercentageDiscountStrategy extends DiscountStrategy {
  calculate(subtotal, value) {
    return subtotal * (value / 100);
  }
}
