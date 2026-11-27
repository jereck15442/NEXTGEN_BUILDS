export class DiscountStrategy {
  calculate(_subtotal, _value) {
    throw new Error('DiscountStrategy.calculate must be implemented');
  }
}
