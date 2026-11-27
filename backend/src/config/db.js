import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);
}
