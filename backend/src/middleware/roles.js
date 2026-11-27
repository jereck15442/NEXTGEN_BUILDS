import { forbidden } from '../utils/errors.js';

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return next(forbidden('Forbidden'));
  return next();
}
