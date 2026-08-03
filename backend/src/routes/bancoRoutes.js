import { Router } from 'express';
import * as controller from '../controllers/bancoController.js';

export const bancoRoutes = Router();

bancoRoutes.get('/', controller.index);
bancoRoutes.post('/', controller.store);
bancoRoutes.put('/:id', controller.update);
bancoRoutes.delete('/:id', controller.destroy);
