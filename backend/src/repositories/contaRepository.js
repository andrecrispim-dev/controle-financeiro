import { getDb } from '../database/db.js';

function mapConta(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    bancoId: row.banco_id,
    banco: row.banco_nome || row.banco,
    agencia: row.agencia,
    numero: row.numero,
    saldoInicialCentavos: row.saldo_inicial_centavos,
    movimentacaoConcluidaCentavos: row.movimentacao_concluida_centavos ?? 0,
    saldoAtualCentavos: row.saldo_atual_centavos ?? row.saldo_inicial_centavos,
    ativa: Boolean(row.ativa),
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const movimentacaoExpression = `
  COALESCE(SUM(
    CASE
      WHEN l.status = 'CONCLUIDO' AND l.tipo = 'RECEBER' THEN l.valor_centavos
      WHEN l.status = 'CONCLUIDO' AND l.tipo = 'PAGAR' THEN -l.valor_centavos
      ELSE 0
    END
  ), 0)
`;

const saldoExpression = `
  c.saldo_inicial_centavos + ${movimentacaoExpression}
`;

export function listContas() {
  return getDb().prepare(`
    SELECT c.*, COALESCE(b.nome, c.banco) AS banco_nome,
      ${movimentacaoExpression} AS movimentacao_concluida_centavos,
      ${saldoExpression} AS saldo_atual_centavos
    FROM contas_bancarias c
    LEFT JOIN bancos b ON b.id = c.banco_id
    LEFT JOIN lancamentos l ON l.conta_id = c.id
    GROUP BY c.id
    ORDER BY c.ativa DESC, c.nome COLLATE NOCASE
  `).all().map(mapConta);
}

export function listContasAtivas() {
  return getDb().prepare(`
    SELECT c.*, COALESCE(b.nome, c.banco) AS banco_nome,
      ${movimentacaoExpression} AS movimentacao_concluida_centavos,
      ${saldoExpression} AS saldo_atual_centavos
    FROM contas_bancarias c
    LEFT JOIN bancos b ON b.id = c.banco_id
    LEFT JOIN lancamentos l ON l.conta_id = c.id
    WHERE c.ativa = 1
    GROUP BY c.id
    ORDER BY c.nome COLLATE NOCASE
  `).all().map(mapConta);
}

export function getContaById(id) {
  return mapConta(getDb().prepare(`
    SELECT c.*, COALESCE(b.nome, c.banco) AS banco_nome,
      ${movimentacaoExpression} AS movimentacao_concluida_centavos,
      ${saldoExpression} AS saldo_atual_centavos
    FROM contas_bancarias c
    LEFT JOIN bancos b ON b.id = c.banco_id
    LEFT JOIN lancamentos l ON l.conta_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(id));
}

export function createConta(data) {
  const result = getDb().prepare(`
    INSERT INTO contas_bancarias (nome, banco_id, banco, agencia, numero, saldo_inicial_centavos, ativa, observacoes)
    VALUES (@nome, @bancoId, @banco, @agencia, @numero, @saldoInicialCentavos, @ativa, @observacoes)
  `).run(data);
  return getContaById(result.lastInsertRowid);
}

export function updateConta(id, data) {
  getDb().prepare(`
    UPDATE contas_bancarias
    SET nome = @nome,
        banco_id = @bancoId,
        banco = @banco,
        agencia = @agencia,
        numero = @numero,
        saldo_inicial_centavos = @saldoInicialCentavos,
        ativa = @ativa,
        observacoes = @observacoes,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return getContaById(id);
}

export function deleteConta(id) {
  return getDb().prepare('DELETE FROM contas_bancarias WHERE id = ?').run(id).changes;
}

export function contaEmUso(id) {
  return getDb().prepare('SELECT COUNT(*) total FROM lancamentos WHERE conta_id = ?').get(id).total > 0;
}

export function totalSaldoContas() {
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(saldo_atual_centavos), 0) total
    FROM (
      SELECT c.id, ${saldoExpression} AS saldo_atual_centavos
      FROM contas_bancarias c
      LEFT JOIN lancamentos l ON l.conta_id = c.id
      WHERE c.ativa = 1
      GROUP BY c.id
    )
  `).get();
  return row.total || 0;
}
