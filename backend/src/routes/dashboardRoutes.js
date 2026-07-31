import { Router } from 'express';
import * as controller from '../controllers/dashboardController.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/resumo', controller.resumo);
dashboardRoutes.get('/proximos-vencimentos', controller.proximos);
