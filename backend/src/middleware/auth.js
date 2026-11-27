import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/async.js';
import { unauthorized } from '../utils/errors.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized('Unauthorized'));
  try {
    req.auth = jwt.verify(token, env.JWT_SECRET);
    return next();
  } catch {
    return next(unauthorized('Unauthorized'));
  }
}

export const loadUser = asyncHandler(async (req, _res, next) => {
  const user = await User.findById(req.auth.userId);
  if (!user) throw unauthorized('Unauthorized');
  req.user = user;
  next();
});
