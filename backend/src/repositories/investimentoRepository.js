import { getDb } from '../database/db.js';

function mapInvestimento(row) {
  if (!row) return null;
  const investido = row.valor_investido_centavos;
  const atual = row.valor_atual_centavos;
  return {
    id: row.id,
    ativo: row.ativo,
    classe: row.classe,
    instituicao: row.instituicao,
    valorInvestidoCentavos: investido,
    valorAtualCentavos: atual,
    rentabilidade: investido > 0 ? (atual - investido) / investido : 0,
    dataAplicacao: row.data_aplicacao,
    origem: row.origem,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listInvestimentos() {
  return getDb().prepare('SELECT * FROM investimentos ORDER BY data_aplicacao DESC, id DESC').all().map(mapInvestimento);
}

export function getInvestimentoById(id) {
  return mapInvestimento(getDb().prepare('SELECT * FROM investimentos WHERE id = ?').get(id));
}

function insertStatement(db) {
  return db.prepare(`
    INSERT INTO investimentos (ativo, classe, instituicao, valor_investido_centavos, valor_atual_centavos, data_aplicacao, origem, observacoes)
    VALUES (@ativo, @classe, @instituicao, @valorInvestidoCentavos, @valorAtualCentavos, @dataAplicacao, @origem, @observacoes)
  `);
}

export function createInvestimento(data) {
  const db = getDb();
  const result = insertStatement(db).run(data);
  return getInvestimentoById(result.lastInsertRowid);
}

export function createInvestimentosBulk(items) {
  const db = getDb();
  const insert = insertStatement(db);
  const ids = [];
  const tx = db.transaction(() => {
    items.forEach((item) => {
      ids.push(insert.run(item).lastInsertRowid);
    });
  });
  tx();
  return ids.map((id) => getInvestimentoById(id));
}

export function updateInvestimento(id, data) {
  getDb().prepare(`
    UPDATE investimentos
    SET ativo = @ativo,
        classe = @classe,
        instituicao = @instituicao,
        valor_investido_centavos = @valorInvestidoCentavos,
        valor_atual_centavos = @valorAtualCentavos,
        data_aplicacao = @dataAplicacao,
        observacoes = @observacoes,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return getInvestimentoById(id);
}

export function deleteInvestimento(id) {
  return getDb().prepare('DELETE FROM investimentos WHERE id = ?').run(id).changes;
}
