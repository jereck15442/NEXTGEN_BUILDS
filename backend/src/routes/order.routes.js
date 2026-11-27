import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { loadUser, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.validator.js';
import { orderListQuerySchema, updateFulfillmentSchema } from '../validators/order.validator.js';

export const orderRoutes = Router();
orderRoutes.use(requireAuth, loadUser);

orderRoutes.get('/admin/all', requireAdmin, validate({ query: orderListQuerySchema }), orderController.adminList);
orderRoutes.patch('/:id/status', requireAdmin, validate({ params: idParamSchema, body: updateFulfillmentSchema }), orderController.updateStatus);
orderRoutes.post('/', orderController.create);
orderRoutes.get('/', validate({ query: orderListQuerySchema }), orderController.list);
orderRoutes.get('/:id', validate({ params: idParamSchema }), orderController.get);
orderRoutes.post('/:id/cancel', validate({ params: idParamSchema }), orderController.cancel);
