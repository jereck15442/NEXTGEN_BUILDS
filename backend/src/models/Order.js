import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const addressSchema = new mongoose.Schema({
  fullName: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },
  region: { type: String, trim: true },
  province: { type: String, trim: true },
  city: { type: String, trim: true },
  barangay: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  streetName: { type: String, trim: true },
  building: { type: String, trim: true },
  houseNo: { type: String, trim: true },
  label: { type: String, enum: ['home', 'work', 'other'], default: 'other' }
}, { _id: false });

export const Order = mongoose.model('Order', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: { type: [orderItemSchema], required: true },
  subtotal: Number,
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  couponCode: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled', 'expired'], default: 'pending' },
  fulfillmentStatus: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  paymentProvider: { type: String, enum: ['maya', 'sandbox'], default: 'sandbox' },
  paymentReference: String,
  checkoutUrl: String,
  paidAt: Date,
  reserved: { type: Boolean, default: true },
  address: addressSchema
}, { timestamps: true }));