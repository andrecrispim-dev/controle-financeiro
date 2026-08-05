import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

function resolveFromBackend(value, fallback) {
  const target = value || fallback;
  return path.isAbsolute(target) ? target : path.resolve(backendRoot, target);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  dbFile: process.env.NODE_ENV === 'test'
    ? (process.env.DB_FILE || ':memory:')
    : resolveFromBackend(process.env.DB_FILE, './data/financeiro.sqlite'),
  backupDir: resolveFromBackend(process.env.BACKUP_DIR, './backups'),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300)
};
