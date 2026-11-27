import { FixedDiscountStrategy } from './fixed-discount.strategy.js';
import { PercentageDiscountStrategy } from './percentage-discount.strategy.js';

const strategies = {
  percentage: new PercentageDiscountStrategy(),
  fixed: new FixedDiscountStrategy()
};

export function getDiscountStrategy(type) {
  const strategy = strategies[type];
  if (!strategy) throw new Error(`Unsupported discount type: ${type}`);
  return strategy;
}
