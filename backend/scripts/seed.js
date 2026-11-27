import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pc-parts-store');

const adminEmail = 'admin@example.com';
if (!await User.exists({ email: adminEmail })) {
  await User.create({
    name: 'Store Admin',
    email: adminEmail,
    passwordHash: await bcrypt.hash('Admin123!', 12),
    role: 'admin'
  });
}

const count = await Product.countDocuments();
if (count === 0) {
  await Product.insertMany([
    { name: 'AMD Ryzen 5 7600', category: 'CPU', price: 12995, stock: 12, specifications: { socket: 'AM5', powerWatts: 65 } },
    { name: 'MSI B650 Tomahawk', category: 'motherboard', price: 11995, stock: 8, specifications: { socket: 'AM5', memoryGenerations: ['DDR5'], formFactor: 'ATX' } },
    { name: 'NVIDIA GeForce RTX 4060', category: 'GPU', price: 18995, stock: 6, specifications: { powerWatts: 115 } },
    { name: 'Corsair Vengeance 32GB DDR5', category: 'RAM', price: 4495, stock: 15, specifications: { memoryGeneration: 'DDR5', powerWatts: 10 } },
    { name: 'Samsung 990 EVO 1TB', category: 'storage', price: 4995, stock: 20, specifications: { powerWatts: 8 } },
    { name: 'Corsair RM750e 750W', category: 'PSU', price: 5795, stock: 10, specifications: { wattage: 750 } },
    { name: 'Fractal Meshify 2 Compact', category: 'case', price: 7495, stock: 7, specifications: { supportedFormFactors: ['ATX', 'Micro ATX', 'Mini ITX'] } }
  ]);
}

console.log(`Seed complete. Admin login: ${adminEmail} / Admin123!`);
await mongoose.disconnect();
