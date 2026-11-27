import mongoose from 'mongoose';

export const SavedBuild = mongoose.model('SavedBuild', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  components: { type: Map, of: mongoose.Schema.Types.ObjectId, default: {} }
}, { timestamps: true }));
