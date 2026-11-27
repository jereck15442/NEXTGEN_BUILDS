import { Router } from 'express';
import * as compatibilityController from '../controllers/compatibility.controller.js';
import { validate } from '../middleware/validate.js';
import { compatibilitySchema } from '../validators/build.validator.js';

export const compatibilityRoutes = Router();

compatibilityRoutes.post('/check', validate({ body: compatibilitySchema }), compatibilityController.check);
