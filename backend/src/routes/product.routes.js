import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { loadUser, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.validator.js';
import { createProductSchema, productListQuerySchema, updateProductSchema } from '../validators/product.validator.js';

export const productRoutes = Router();

productRoutes.get('/', validate({ query: productListQuerySchema }), productController.list);
productRoutes.get('/admin/low-stock', requireAuth, loadUser, requireAdmin, productController.lowStock);
productRoutes.get('/:id', validate({ params: idParamSchema }), productController.get);
productRoutes.post('/', requireAuth, loadUser, requireAdmin, validate({ body: createProductSchema }), productController.create);
productRoutes.patch('/:id', requireAuth, loadUser, requireAdmin, validate({ params: idParamSchema, body: updateProductSchema }), productController.update);
productRoutes.delete('/:id', requireAuth, loadUser, requireAdmin, validate({ params: idParamSchema }), productController.remove);
