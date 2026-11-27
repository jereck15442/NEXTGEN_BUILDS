import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  region: { type: String, trim: true },
  province: { type: String, trim: true },
  city: { type: String, trim: true },
  barangay: { type: String, trim: true },
  postalCode: { type: String, required: true, trim: true },
  streetName: { type: String, trim: true },
  building: { type: String, trim: true },
  houseNo: { type: String, trim: true },
  label: { type: String, enum: ['home', 'work', 'other'], default: 'other' },
  default: { type: Boolean, default: false }
}, { timestamps: true });

export const Address = mongoose.model('Address', addressSchema);
