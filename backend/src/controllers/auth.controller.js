import { asyncHandler } from '../utils/async.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  res.status(201).json(await authService.register(req.body));
});

export const login = asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body));
});

export const logout = (_req, res) => {
  res.json({ message: 'Logged out' });
};

export const me = (req, res) => {
  res.json(authService.toPublicUser(req.user));
};
