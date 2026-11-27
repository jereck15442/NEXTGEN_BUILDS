import mongoose from 'mongoose';

export const WebhookEvent = mongoose.model('WebhookEvent', new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  provider: { type: String, default: 'maya' },
  payloadHash: String,
  processedAt: { type: Date, default: Date.now }
}, { timestamps: true }));
