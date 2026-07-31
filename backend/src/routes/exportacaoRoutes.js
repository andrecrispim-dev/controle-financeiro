import { Router } from 'express';
import * as controller from '../controllers/exportacaoController.js';

export const exportacaoRoutes = Router();

exportacaoRoutes.get('/csv', controller.csv);
