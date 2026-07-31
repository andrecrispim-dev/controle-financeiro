import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

function ensureBackupDir() {
  fs.mkdirSync(env.backupDir, { recursive: true });
}

export function criarBackup() {
  if (env.dbFile === ':memory:') throw new AppError('Backup nao disponivel em banco em memoria.', 400);
  ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const arquivo = `financeiro-${stamp}.sqlite`;
  fs.copyFileSync(env.dbFile, path.join(env.backupDir, arquivo));
  return { arquivo, criadoEm: new Date().toISOString() };
}

export function listarBackups() {
  ensureBackupDir();
  return fs.readdirSync(env.backupDir)
    .filter((file) => /^financeiro-[\w.-]+\.sqlite$/.test(file))
    .map((file) => {
      const stat = fs.statSync(path.join(env.backupDir, file));
      return { arquivo: file, tamanhoBytes: stat.size, criadoEm: stat.birthtime.toISOString() };
    })
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function caminhoBackup(arquivo) {
  if (!/^financeiro-[\w.-]+\.sqlite$/.test(arquivo)) throw new AppError('Arquivo de backup invalido.', 400);
  const fullPath = path.join(env.backupDir, arquivo);
  if (!fs.existsSync(fullPath)) throw new AppError('Backup nao encontrado.', 404);
  return fullPath;
}
