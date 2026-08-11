import { getDb } from '../database/db.js';

function mapMeta(row) {
  if (!row) return null;
  const valorAlvo = row.valor_alvo_centavos;
  const valorAtual = row.valor_atual_centavos;
  return {
    id: row.id,
    nome: row.nome,
    valorAlvoCentavos: valorAlvo,
    valorAtualCentavos: valorAtual,
    progresso: valorAlvo > 0 ? Math.min(1, valorAtual / valorAlvo) : 0,
    dataAlvo: row.data_alvo,
    cor: row.cor,
    contaId: row.conta_id,
    contaNome: row.conta_nome,
    status: row.status,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAporte(row) {
  if (!row) return null;
  return {
    id: row.id,
    metaId: row.meta_id,
    data: row.data,
    valorCentavos: row.valor_centavos,
    observacoes: row.observacoes,
    createdAt: row.created_at
  };
}

const baseSelect = `
  SELECT m.*, c.nome AS conta_nome
  FROM metas m
  LEFT JOIN contas_bancarias c ON c.id = m.conta_id
`;

export function listMetas() {
  return getDb().prepare(`${baseSelect} ORDER BY (m.status = 'EM_ANDAMENTO') DESC, m.data_alvo IS NULL, m.data_alvo ASC`).all().map(mapMeta);
}

export function getMetaById(id) {
  return mapMeta(getDb().prepare(`${baseSelect} WHERE m.id = ?`).get(id));
}

export function createMeta(data) {
  const result = getDb().prepare(`
    INSERT INTO metas (nome, valor_alvo_centavos, valor_atual_centavos, data_alvo, cor, conta_id, status, observacoes)
    VALUES (@nome, @valorAlvoCentavos, @valorAtualCentavos, @dataAlvo, @cor, @contaId, @status, @observacoes)
  `).run(data);
  return getMetaById(result.lastInsertRowid);
}

export function updateMeta(id, data) {
  getDb().prepare(`
    UPDATE metas
    SET nome = @nome,
        valor_alvo_centavos = @valorAlvoCentavos,
        data_alvo = @dataAlvo,
        cor = @cor,
        conta_id = @contaId,
        status = @status,
        observacoes = @observacoes,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return getMetaById(id);
}

export function deleteMeta(id) {
  return getDb().prepare('DELETE FROM metas WHERE id = ?').run(id).changes;
}

export function listAportes(metaId) {
  return getDb().prepare('SELECT * FROM meta_aportes WHERE meta_id = ? ORDER BY data DESC, id DESC').all(metaId).map(mapAporte);
}

export function createAporte(metaId, data) {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO meta_aportes (meta_id, data, valor_centavos, observacoes)
      VALUES (@metaId, @data, @valorCentavos, @observacoes)
    `).run({ metaId, ...data });
    db.prepare(`
      UPDATE metas
      SET valor_atual_centavos = valor_atual_centavos + @valorCentavos,
          updated_at = datetime('now')
      WHERE id = @metaId
    `).run({ metaId, valorCentavos: data.valorCentavos });
  });
  tx();
  return getMetaById(metaId);
}
