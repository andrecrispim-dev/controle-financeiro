import { Router } from 'express';
import * as controller from '../controllers/contaController.js';

export const contaRoutes = Router();

contaRoutes.get('/', controller.index);
contaRoutes.post('/', controller.store);
contaRoutes.put('/:id', controller.update);
contaRoutes.delete('/:id', controller.destroy);
