import { Cart } from '../models/Cart.js';

export const cartRepository = {
  findByUser(userId) {
    return Cart.findOne({ user: userId });
  },
  findPopulatedByUser(userId) {
    return Cart.findOne({ user: userId }).populate('items.product');
  },
  createForUser(userId) {
    return Cart.create({ user: userId, items: [] });
  },
  setCoupon(userId, code) {
    return Cart.updateOne({ user: userId }, { couponCode: code });
  }
};
