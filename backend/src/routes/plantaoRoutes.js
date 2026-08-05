import { Router } from 'express';
import * as controller from '../controllers/plantaoController.js';

export const plantaoRoutes = Router();

plantaoRoutes.get('/', controller.index);
plantaoRoutes.post('/', controller.store);
plantaoRoutes.put('/:id', controller.update);
plantaoRoutes.delete('/:id', controller.destroy);
plantaoRoutes.post('/lancar', controller.lancar);
plantaoRoutes.get('/valores', controller.valores);
plantaoRoutes.put('/valores/:id', controller.updateValor);
plantaoRoutes.get('/feriados', controller.feriados);
plantaoRoutes.post('/feriados', controller.storeFeriado);
plantaoRoutes.put('/feriados/:id', controller.updateFeriadoItem);
plantaoRoutes.delete('/feriados/:id', controller.destroyFeriado);
