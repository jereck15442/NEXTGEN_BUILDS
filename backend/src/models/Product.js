import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, required: true, enum: ['CPU', 'motherboard', 'GPU', 'RAM', 'storage', 'PSU', 'case'] },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, min: 0, default: 5 },
  active: { type: Boolean, default: true },
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text' });
export const Product = mongoose.model('Product', productSchema);
