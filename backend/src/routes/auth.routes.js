import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { loadUser, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';

export const authRoutes = Router();

authRoutes.post('/register', validate({ body: registerSchema }), authController.register);
authRoutes.post('/login', validate({ body: loginSchema }), authController.login);
authRoutes.post('/logout', requireAuth, authController.logout);
authRoutes.get('/me', requireAuth, loadUser, authController.me);
