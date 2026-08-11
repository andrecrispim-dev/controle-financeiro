import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/investimentoController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

export const investimentoRoutes = Router();

investimentoRoutes.get('/', controller.index);
investimentoRoutes.post('/', controller.store);
investimentoRoutes.post('/importar', upload.single('arquivo'), controller.importar);
investimentoRoutes.get('/:id', controller.show);
investimentoRoutes.put('/:id', controller.update);
investimentoRoutes.delete('/:id', controller.destroy);
