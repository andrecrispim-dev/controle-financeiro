import { Router } from 'express';
import * as controller from '../controllers/metaController.js';

export const metaRoutes = Router();

metaRoutes.get('/', controller.index);
metaRoutes.post('/', controller.store);
metaRoutes.get('/:id', controller.show);
metaRoutes.put('/:id', controller.update);
metaRoutes.delete('/:id', controller.destroy);
metaRoutes.get('/:id/aportes', controller.indexAportes);
metaRoutes.post('/:id/aportes', controller.storeAporte);
