import crypto from 'node:crypto';
import { getDb } from '../database/db.js';
import { addDaysISO, monthRangeISO, todayISO } from '../utils/dateUtils.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tipo: row.tipo,
    descricao: row.descricao,
    categoriaId: row.categoria_id,
    categoria: row.categoria,
    valorCentavos: row.valor_centavos,
    valor: row.valor_centavos / 100,
    dataVencimento: row.data_vencimento,
    dataPagamento: row.data_pagamento,
    status: row.status,
    observacoes: row.observacoes,
    recorrenciaGrupo: row.recorrencia_grupo,
    vencido: row.status === 'PENDENTE' && row.data_vencimento < todayISO(),
    venceHoje: row.status === 'PENDENTE' && row.data_vencimento === todayISO(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildWhere(filters = {}) {
  const clauses = [];
  const params = {};
  if (filters.tipo) { clauses.push('tipo = @tipo'); params.tipo = filters.tipo; }
  if (filters.status === 'VENCIDO') {
    clauses.push("status = 'PENDENTE' AND data_vencimento < @hoje");
    params.hoje = todayISO();
  } else if (filters.status) {
    clauses.push('status = @status');
    params.status = filters.status;
  }
  if (filters.categoria) {
    clauses.push('LOWER(COALESCE(categoria, \'\')) = LOWER(@categoria)');
    params.categoria = filters.categoria;
  }
  if (filters.dataInicial) { clauses.push('data_vencimento >= @dataInicial'); params.dataInicial = filters.dataInicial; }
  if (filters.dataFinal) { clauses.push('data_vencimento <= @dataFinal'); params.dataFinal = filters.dataFinal; }
  if (filters.descricao) {
    clauses.push('LOWER(descricao) LIKE @descricao');
    params.descricao = `%${filters.descricao.toLowerCase()}%`;
  }
  if (filters.valorMin !== undefined) { clauses.push('valor_centavos >= @valorMin'); params.valorMin = filters.valorMin; }
  if (filters.valorMax !== undefined) { clauses.push('valor_centavos <= @valorMax'); params.valorMax = filters.valorMax; }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export function listLancamentos(filters) {
  const db = getDb();
  const allowedOrder = { data_vencimento: 'data_vencimento', valor: 'valor_centavos', descricao: 'descricao' };
  const orderBy = allowedOrder[filters.ordenarPor] || 'data_vencimento';
  const order = filters.ordem === 'desc' ? 'DESC' : 'ASC';
  const { where, params } = buildWhere(filters);
  const offset = (filters.pagina - 1) * filters.limite;
  const rows = db.prepare(`
    SELECT * FROM lancamentos
    ${where}
    ORDER BY ${orderBy} COLLATE NOCASE ${order}, id DESC
    LIMIT @limite OFFSET @offset
  `).all({ ...params, limite: filters.limite, offset });
  const total = db.prepare(`SELECT COUNT(*) as total FROM lancamentos ${where}`).get(params).total;
  return { items: rows.map(mapRow), total };
}

export function listAllLancamentos(filters = {}) {
  const db = getDb();
  const { where, params } = buildWhere(filters);
  return db.prepare(`SELECT * FROM lancamentos ${where} ORDER BY data_vencimento ASC, id DESC`).all(params).map(mapRow);
}

export function getLancamentoById(id) {
  return mapRow(getDb().prepare('SELECT * FROM lancamentos WHERE id = ?').get(id));
}

export function createLancamento(data, db = getDb(), recorrenciaGrupo = null) {
  const result = db.prepare(`
    INSERT INTO lancamentos
      (tipo, descricao, categoria_id, categoria, valor_centavos, data_vencimento, data_pagamento, status, observacoes, recorrencia_grupo)
    VALUES
      (@tipo, @descricao, @categoriaId, @categoria, @valorCentavos, @dataVencimento, @dataPagamento, @status, @observacoes, @recorrenciaGrupo)
  `).run({ ...data, recorrenciaGrupo });
  return getLancamentoById(result.lastInsertRowid);
}

export function createManyLancamentos(items) {
  const db = getDb();
  const group = crypto.randomUUID();
  const tx = db.transaction((rows) => rows.map((row) => createLancamento(row, db, group)));
  return tx(items);
}

export function updateLancamento(id, data) {
  getDb().prepare(`
    UPDATE lancamentos
    SET tipo = @tipo,
        descricao = @descricao,
        categoria_id = @categoriaId,
        categoria = @categoria,
        valor_centavos = @valorCentavos,
        data_vencimento = @dataVencimento,
        data_pagamento = @dataPagamento,
        status = @status,
        observacoes = @observacoes,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return getLancamentoById(id);
}

export function deleteLancamento(id) {
  return getDb().prepare('DELETE FROM lancamentos WHERE id = ?').run(id).changes;
}

export function setStatus(id, status, dataPagamento = null) {
  getDb().prepare(`
    UPDATE lancamentos
    SET status = ?, data_pagamento = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, dataPagamento, id);
  return getLancamentoById(id);
}

export function dashboardResumo(periodo = null) {
  const hoje = todayISO();
  const mesAtual = periodo
    ? { start: periodo.dataInicial, end: periodo.dataFinal }
    : monthRangeISO(hoje);
  const pendentes = getDb().prepare(`
    SELECT tipo, SUM(valor_centavos) as total, COUNT(*) as quantidade
    FROM lancamentos
    WHERE status = 'PENDENTE'
      AND data_vencimento BETWEEN ? AND ?
    GROUP BY tipo
  `).all(mesAtual.start, mesAtual.end);
  const concluidos = getDb().prepare(`
    SELECT tipo, SUM(valor_centavos) as total, COUNT(*) as quantidade
    FROM lancamentos
    WHERE status = 'CONCLUIDO'
      AND data_vencimento BETWEEN ? AND ?
    GROUP BY tipo
  `).all(mesAtual.start, mesAtual.end);
  const resumo = {
    totalReceberPendente: 0, totalPagarPendente: 0, saldoProjetado: 0,
    totalRecebido: 0, totalPago: 0, saldoRealizado: 0,
    vencidas: 0, vencendoHoje: 0, proximosSeteDias: 0,
    periodo: { dataInicial: mesAtual.start, dataFinal: mesAtual.end }
  };
  pendentes.forEach((row) => {
    const total = row.total || 0;
    if (row.tipo === 'RECEBER') resumo.totalReceberPendente = total;
    if (row.tipo === 'PAGAR') resumo.totalPagarPendente = total;
  });
  concluidos.forEach((row) => {
    const total = row.total || 0;
    if (row.tipo === 'RECEBER') resumo.totalRecebido = total;
    if (row.tipo === 'PAGAR') resumo.totalPago = total;
  });
  resumo.vencidas = getDb().prepare("SELECT COUNT(*) total FROM lancamentos WHERE status = 'PENDENTE' AND data_vencimento < ? AND data_vencimento BETWEEN ? AND ?").get(hoje, mesAtual.start, mesAtual.end).total;
  resumo.vencendoHoje = getDb().prepare("SELECT COUNT(*) total FROM lancamentos WHERE status = 'PENDENTE' AND data_vencimento = ? AND data_vencimento BETWEEN ? AND ?").get(hoje, mesAtual.start, mesAtual.end).total;
  const limiteSeteDias = addDaysISO(hoje, 7) < mesAtual.end ? addDaysISO(hoje, 7) : mesAtual.end;
  resumo.proximosSeteDias = getDb().prepare("SELECT COUNT(*) total FROM lancamentos WHERE status = 'PENDENTE' AND data_vencimento > ? AND data_vencimento <= ?").get(hoje, limiteSeteDias).total;
  resumo.saldoProjetado = resumo.totalReceberPendente - resumo.totalPagarPendente;
  resumo.saldoRealizado = resumo.totalRecebido - resumo.totalPago;
  return resumo;
}

export function proximosVencimentos(limit = 8, periodo = null) {
  const mesAtual = periodo
    ? { start: periodo.dataInicial, end: periodo.dataFinal }
    : monthRangeISO();
  return getDb().prepare(`
    SELECT * FROM lancamentos
    WHERE status = 'PENDENTE'
      AND data_vencimento BETWEEN ? AND ?
    ORDER BY data_vencimento ASC
    LIMIT ?
  `).all(mesAtual.start, mesAtual.end, limit).map(mapRow);
}

export function relatorioPeriodo(filters) {
  const { where, params } = buildWhere(filters);
  const rows = getDb().prepare(`
    SELECT tipo, status, SUM(valor_centavos) total, COUNT(*) quantidade
    FROM lancamentos
    ${where}
    GROUP BY tipo, status
  `).all(params);
  const resumo = {
    previstoReceber: 0, previstoPagar: 0, saldoPrevisto: 0,
    recebido: 0, pago: 0, saldoRealizado: 0,
    pendentes: 0, concluidos: 0, vencidas: 0
  };
  rows.forEach((row) => {
    if (row.status === 'PENDENTE') resumo.pendentes += row.quantidade;
    if (row.status === 'CONCLUIDO') resumo.concluidos += row.quantidade;
    if (row.tipo === 'RECEBER' && row.status === 'PENDENTE') resumo.previstoReceber = row.total || 0;
    if (row.tipo === 'PAGAR' && row.status === 'PENDENTE') resumo.previstoPagar = row.total || 0;
    if (row.tipo === 'RECEBER' && row.status === 'CONCLUIDO') resumo.recebido = row.total || 0;
    if (row.tipo === 'PAGAR' && row.status === 'CONCLUIDO') resumo.pago = row.total || 0;
  });
  const vencidasFilters = { ...filters, status: 'VENCIDO' };
  const vencidasWhere = buildWhere(vencidasFilters);
  resumo.vencidas = getDb().prepare(`SELECT COUNT(*) total FROM lancamentos ${vencidasWhere.where}`).get(vencidasWhere.params).total;
  resumo.saldoPrevisto = resumo.previstoReceber - resumo.previstoPagar;
  resumo.saldoRealizado = resumo.recebido - resumo.pago;
  return resumo;
}

export function porCategoria(filters) {
  const { where, params } = buildWhere(filters);
  return getDb().prepare(`
    SELECT COALESCE(categoria, 'Sem categoria') categoria, tipo, status, SUM(valor_centavos) total
    FROM lancamentos
    ${where}
    GROUP BY categoria, tipo, status
    ORDER BY categoria COLLATE NOCASE
  `).all(params);
}

export function porMes(filters) {
  const { where, params } = buildWhere(filters);
  return getDb().prepare(`
    SELECT substr(data_vencimento, 1, 7) mes, tipo, status, SUM(valor_centavos) total
    FROM lancamentos
    ${where}
    GROUP BY mes, tipo, status
    ORDER BY mes ASC
  `).all(params);
}
