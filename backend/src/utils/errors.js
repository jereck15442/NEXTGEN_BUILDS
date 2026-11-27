export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

export const badRequest = (message = 'Bad request', details) => new AppError(400, message, details);
export const unauthorized = (message = 'Unauthorized', details) => new AppError(401, message, details);
export const forbidden = (message = 'Forbidden', details) => new AppError(403, message, details);
export const notFound = (message = 'Not found', details) => new AppError(404, message, details);
export const conflict = (message = 'Conflict', details) => new AppError(409, message, details);
export const unprocessable = (message = 'Unprocessable request', details) => new AppError(422, message, details);
export const serviceUnavailable = (message = 'Service unavailable', details) => new AppError(503, message, details);
