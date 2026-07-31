import { Router } from 'express';
import * as controller from '../controllers/relatorioController.js';

export const relatorioRoutes = Router();

relatorioRoutes.get('/resumo', controller.resumo);
relatorioRoutes.get('/por-categoria', controller.categoria);
relatorioRoutes.get('/por-mes', controller.mes);
