import { Product } from '../models/Product.js';

export const productRepository = {
  findMany({ filter, sort, skip, limit }) {
    return Product.find(filter).sort(sort).skip(skip).limit(limit);
  },
  count(filter) {
    return Product.countDocuments(filter);
  },
  findById(id) {
    return Product.findById(id);
  },
  findActiveById(id) {
    return Product.findOne({ _id: id, active: true });
  },
  create(data) {
    return Product.create(data);
  },
  updateById(id, data) {
    return Product.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
  },
  deactivate(id) {
    return Product.findByIdAndUpdate(id, { active: false }, { returnDocument: 'after' });
  },
  findLowStock() {
    return Product.find({
      active: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).sort({ stock: 1 });
  },
  findCandidates({ budget }) {
    return Product.find({ active: true, stock: { $gt: 0 }, price: { $lte: budget } })
      .sort({ price: 1 })
      .limit(100);
  },
  findAvailable() {
    return Product.find({ active: true, stock: { $gt: 0 } })
      .sort({ price: 1 })
      .limit(500);
  },
  decrementStock(productId, quantity, session) {
    return Product.updateOne(
      { _id: productId, active: true, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { session }
    );
  },
  incrementStock(productId, quantity, session) {
    return Product.updateOne({ _id: productId }, { $inc: { stock: quantity } }, { session });
  }
};
