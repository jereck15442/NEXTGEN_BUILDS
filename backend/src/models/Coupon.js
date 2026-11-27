import mongoose from 'mongoose';

export const Coupon = mongoose.model('Coupon', new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minimumPurchase: { type: Number, default: 0, min: 0 },
  usageLimit: { type: Number, default: null, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true }));
