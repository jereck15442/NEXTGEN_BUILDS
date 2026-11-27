import { User } from '../models/User.js';

export const userRepository = {
  findById(id) {
    return User.findById(id);
  },
  findByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  },
  existsByEmail(email) {
    return User.exists({ email: email.toLowerCase() });
  },
  create(data) {
    return User.create(data);
  }
};
