import { Router } from 'express';
import * as controller from '../controllers/lancamentoController.js';

export const lancamentoRoutes = Router();

lancamentoRoutes.get('/', controller.index);
lancamentoRoutes.get('/:id', controller.show);
lancamentoRoutes.post('/', controller.store);
lancamentoRoutes.put('/:id', controller.update);
lancamentoRoutes.delete('/:id', controller.destroy);
lancamentoRoutes.patch('/:id/concluir', controller.concluir);
lancamentoRoutes.patch('/:id/reabrir', controller.reabrir);
lancamentoRoutes.patch('/:id/cancelar', controller.cancelar);
