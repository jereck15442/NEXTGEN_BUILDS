import { Order } from '../models/Order.js';

export const orderRepository = {
  async create(orderData, session) {
    const [order] = await Order.create([orderData], { session });
    return order;
  },
  findById(id) {
    return Order.findById(id);
  },
  findPage({ filter = {}, skip, limit }) {
    return Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  },
  count(filter = {}) {
    return Order.countDocuments(filter);
  }
};
