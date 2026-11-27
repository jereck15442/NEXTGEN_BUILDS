import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { loadUser, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addCartItemSchema, cartItemParamsSchema, updateCartItemSchema } from '../validators/cart.validator.js';

export const cartRoutes = Router();
cartRoutes.use(requireAuth, loadUser);

cartRoutes.get('/', cartController.get);
cartRoutes.post('/items', validate({ body: addCartItemSchema }), cartController.add);
cartRoutes.patch('/items/:productId', validate({ params: cartItemParamsSchema, body: updateCartItemSchema }), cartController.update);
cartRoutes.delete('/items/:productId', validate({ params: cartItemParamsSchema }), cartController.remove);
