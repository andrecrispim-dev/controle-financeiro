import { Router } from 'express';
import * as controller from '../controllers/categoriaController.js';

export const categoriaRoutes = Router();

categoriaRoutes.get('/', controller.index);
categoriaRoutes.post('/', controller.store);
categoriaRoutes.put('/:id', controller.update);
categoriaRoutes.delete('/:id', controller.destroy);
