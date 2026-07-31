import { caminhoBackup, criarBackup, listarBackups } from '../services/backupService.js';
import { successResponse } from '../utils/apiResponse.js';

export function store(req, res) {
  successResponse(res, { status: 201, message: 'Backup criado com sucesso.', data: criarBackup() });
}

export function index(req, res) {
  successResponse(res, { message: 'Backups listados com sucesso.', data: listarBackups() });
}

export function download(req, res) {
  res.download(caminhoBackup(req.params.arquivo));
}
