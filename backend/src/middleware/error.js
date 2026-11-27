import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
}

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ZodError) {
    return res.status(422).json({ message: 'Validation error', details: error.issues });
  }

  if (error instanceof AppError) {
    const body = { message: error.message };
    if (error.details !== undefined) body.details = error.details;
    return res.status(error.status).json(body);
  }

  if (error?.code === 11000) {
    return res.status(409).json({ message: 'Resource already exists' });
  }

  if (error?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier' });
  }

  logger.error(error);
  return res.status(500).json({ message: 'Internal server error' });
}
