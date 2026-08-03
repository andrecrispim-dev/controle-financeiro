import { getDb } from '../database/db.js';

export function listBancos() {
  return getDb().prepare('SELECT * FROM bancos ORDER BY nome COLLATE NOCASE').all();
}

export function getBancoById(id) {
  return getDb().prepare('SELECT * FROM bancos WHERE id = ?').get(id);
}

export function createBanco(data) {
  const result = getDb().prepare('INSERT INTO bancos (nome, codigo) VALUES (?, ?)').run(data.nome, data.codigo || null);
  return getBancoById(result.lastInsertRowid);
}

export function updateBanco(id, data) {
  getDb().prepare('UPDATE bancos SET nome = ?, codigo = ?, updated_at = datetime(\'now\') WHERE id = ?').run(data.nome, data.codigo || null, id);
  return getBancoById(id);
}

export function deleteBanco(id) {
  return getDb().prepare('DELETE FROM bancos WHERE id = ?').run(id).changes;
}

export function bancoEmUso(id) {
  return getDb().prepare('SELECT COUNT(*) total FROM contas_bancarias WHERE banco_id = ?').get(id).total > 0;
}
