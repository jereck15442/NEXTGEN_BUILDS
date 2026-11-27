import mongoose from 'mongoose';
import { productRepository } from '../repositories/product.repository.js';

export async function releaseReservation(order) {
  if (!order.reserved) return;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of order.items) {
        await productRepository.incrementStock(item.product, item.quantity, session);
      }
      order.reserved = false;
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
}
