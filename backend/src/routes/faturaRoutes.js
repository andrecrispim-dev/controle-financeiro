import { Router } from 'express';
import multer from 'multer';
import * as controller from '../controllers/faturaController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

export const faturaRoutes = Router();

faturaRoutes.post('/analisar', upload.single('arquivo'), controller.analisar);
faturaRoutes.post('/confirmar', controller.confirmar);
faturaRoutes.get('/', controller.listar);
faturaRoutes.get('/itens', controller.itens);
faturaRoutes.get('/gastos-por-categoria', controller.gastosCategoria);
faturaRoutes.patch('/itens/:id/categoria', controller.atualizarCategoria);
faturaRoutes.get('/:id', controller.buscar);
faturaRoutes.delete('/:id', controller.remover);
