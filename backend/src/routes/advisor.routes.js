import { Router } from 'express';
import * as advisorController from '../controllers/advisor.controller.js';
import { loadUser, requireAuth } from '../middleware/auth.js';
import { advisorRateLimit } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { advisorSchema } from '../validators/advisor.validator.js';

export const advisorRoutes = Router();
advisorRoutes.use(requireAuth, loadUser, advisorRateLimit);

advisorRoutes.post('/recommend', validate({ body: advisorSchema }), advisorController.recommend);
