import { Router } from 'express';
import * as controller from '../controllers/backupController.js';

export const backupRoutes = Router();

backupRoutes.post('/', controller.store);
backupRoutes.get('/', controller.index);
backupRoutes.get('/:arquivo/download', controller.download);
