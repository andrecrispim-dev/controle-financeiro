import { AppError } from '../utils/AppError.js';
import {
  categoriaEmUso,
  createCategoria,
  deleteCategoria,
  getCategoriaById,
  listCategorias,
  updateCategoria
} from '../repositories/categoriaRepository.js';

export function listarCategorias() {
  return listCategorias();
}

export function criarCategoria(payload) {
  try {
    return createCategoria(payload);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError('Ja existe uma categoria com esse nome.', 409);
    }
    throw error;
  }
}

export function editarCategoria(id, payload) {
  if (!getCategoriaById(id)) throw new AppError('Categoria nao encontrada.', 404);
  try {
    return updateCategoria(id, payload);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError('Ja existe uma categoria com esse nome.', 409);
    }
    throw error;
  }
}

export function excluirCategoria(id) {
  if (!getCategoriaById(id)) throw new AppError('Categoria nao encontrada.', 404);
  if (categoriaEmUso(id)) {
    throw new AppError('Nao e possivel excluir uma categoria em uso.', 409);
  }
  deleteCategoria(id);
}
