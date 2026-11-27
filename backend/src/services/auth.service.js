import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { conflict, unauthorized } from '../utils/errors.js';

export function toPublicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

export async function register({ name, email, password }) {
  if (await userRepository.existsByEmail(email)) throw conflict('Email is already registered');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await userRepository.create({ name, email, passwordHash });
  return toPublicUser(user);
}

export async function login({ email, password }) {
  const user = await userRepository.findByEmailWithPassword(email);
  if (!user || !(await user.comparePassword(password))) throw unauthorized('Invalid credentials');
  const token = jwt.sign({ userId: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: '8h' });
  return { token, user: toPublicUser(user) };
}
