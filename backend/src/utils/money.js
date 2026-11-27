export function clampDiscount(subtotal, discount) {
  return Math.min(Math.max(discount, 0), subtotal);
}

export function sumLineItems(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
