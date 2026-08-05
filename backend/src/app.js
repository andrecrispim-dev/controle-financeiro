import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { getDb } from './database/db.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import { lancamentoRoutes } from './routes/lancamentoRoutes.js';
import { categoriaRoutes } from './routes/categoriaRoutes.js';
import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { relatorioRoutes } from './routes/relatorioRoutes.js';
import { exportacaoRoutes } from './routes/exportacaoRoutes.js';
import { backupRoutes } from './routes/backupRoutes.js';
import { contaRoutes } from './routes/contaRoutes.js';
import { bancoRoutes } from './routes/bancoRoutes.js';
import { faturaRoutes } from './routes/faturaRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

getDb();

export const app = express();

app.use(helmet({
  contentSecurityPolicy: env.nodeEnv === 'production' ? undefined : false
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem nao permitida pelo CORS.'));
  }
}));
app.use(rateLimit({ windowMs: env.rateLimitWindowMs, max: env.rateLimitMax }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API online.' }));
app.use('/api/lancamentos', lancamentoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/bancos', bancoRoutes);
app.use('/api/contas', contaRoutes);
app.use('/api/faturas', faturaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/exportacoes', exportacaoRoutes);
app.use('/api/backups', backupRoutes);

if (env.nodeEnv === 'production') {
  const publicDir = path.resolve(__dirname, '../../public');
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
