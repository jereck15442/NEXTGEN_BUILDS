import { Router } from 'express';
import * as buildController from '../controllers/build.controller.js';
import { loadUser, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.validator.js';
import { saveBuildSchema, validateBuildSchema } from '../validators/build.validator.js';

export const buildRoutes = Router();
buildRoutes.use(requireAuth, loadUser);

buildRoutes.post('/validate', validate({ body: validateBuildSchema }), buildController.validate);
buildRoutes.post('/', validate({ body: saveBuildSchema }), buildController.create);
buildRoutes.get('/', buildController.list);
buildRoutes.get('/:id', validate({ params: idParamSchema }), buildController.get);
buildRoutes.post('/:id/cart', validate({ params: idParamSchema }), buildController.addToCart);
