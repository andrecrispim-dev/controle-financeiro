import { getDb } from '../database/db.js';

export function listCategorias() {
  return getDb().prepare('SELECT * FROM categorias ORDER BY nome COLLATE NOCASE').all();
}

export function getCategoriaById(id) {
  return getDb().prepare('SELECT * FROM categorias WHERE id = ?').get(id);
}

export function createCategoria(data) {
  const result = getDb().prepare('INSERT INTO categorias (nome, tipo) VALUES (?, ?)').run(data.nome, data.tipo);
  return getCategoriaById(result.lastInsertRowid);
}

export function updateCategoria(id, data) {
  getDb().prepare('UPDATE categorias SET nome = ?, tipo = ?, updated_at = datetime(\'now\') WHERE id = ?').run(data.nome, data.tipo, id);
  return getCategoriaById(id);
}

export function deleteCategoria(id) {
  return getDb().prepare('DELETE FROM categorias WHERE id = ?').run(id).changes;
}

export function categoriaEmUso(id) {
  return getDb().prepare('SELECT COUNT(*) total FROM lancamentos WHERE categoria_id = ?').get(id).total > 0;
}
