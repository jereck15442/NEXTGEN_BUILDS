import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';
import { validate } from '../middleware/validate.js';
import { paymentReturnParamsSchema } from '../validators/payment.validator.js';

export const paymentRoutes = Router();

paymentRoutes.post('/webhook', webhookController.handle);
paymentRoutes.get('/return/:result', validate({ params: paymentReturnParamsSchema }), webhookController.returnPage);
