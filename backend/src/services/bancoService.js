import { AppError } from '../utils/AppError.js';
import { bancoEmUso, createBanco, deleteBanco, getBancoById, listBancos, updateBanco } from '../repositories/bancoRepository.js';

export function listarBancos() {
  return listBancos();
}

export function criarBanco(payload) {
  try {
    return createBanco(payload);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError('Ja existe um banco com esse nome.', 409);
    }
    throw error;
  }
}

export function editarBanco(id, payload) {
  if (!getBancoById(id)) throw new AppError('Banco nao encontrado.', 404);
  try {
    return updateBanco(id, payload);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError('Ja existe um banco com esse nome.', 409);
    }
    throw error;
  }
}

export function excluirBanco(id) {
  if (!getBancoById(id)) throw new AppError('Banco nao encontrado.', 404);
  if (bancoEmUso(id)) throw new AppError('Nao e possivel excluir um banco em uso.', 409);
  deleteBanco(id);
}
