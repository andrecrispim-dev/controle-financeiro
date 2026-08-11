import crypto from 'node:crypto';
import { getDb } from '../database/db.js';
import { addDaysISO, monthRangeISO, todayISO } from '../utils/dateUtils.js';
import { totalSaldoContas } from './contaRepository.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tipo: row.tipo,
    descricao: row.descricao,
    categoriaId: row.categoria_id,
    contaId: row.conta_id,
    contaNome: row.conta_nome,
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

function buildWhere(filters = {}, dateColumn = 'data_vencimento') {
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
  if (filters.contaId) { clauses.push('conta_id = @contaId'); params.contaId = filters.contaId; }
  if (filters.dataInicial) { clauses.push(`${dateColumn} >= @dataInicial`); params.dataInicial = filters.dataInicial; }
  if (filters.dataFinal) { clauses.push(`${dateColumn} <= @dataFinal`); params.dataFinal = filters.dataFinal; }
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
    SELECT l.*, c.nome AS conta_nome
    FROM lancamentos l
    LEFT JOIN contas_bancarias c ON c.id = l.conta_id
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
  return db.prepare(`
    SELECT l.*, c.nome AS conta_nome
    FROM lancamentos l
    LEFT JOIN contas_bancarias c ON c.id = l.conta_id
    ${where}
    ORDER BY data_vencimento ASC, id DESC
  `).all(params).map(mapRow);
}

export function getLancamentoById(id) {
  return mapRow(getDb().prepare(`
    SELECT l.*, c.nome AS conta_nome
    FROM lancamentos l
    LEFT JOIN contas_bancarias c ON c.id = l.conta_id
    WHERE l.id = ?
  `).get(id));
}

export function createLancamento(data, db = getDb(), recorrenciaGrupo = null) {
  const result = db.prepare(`
    INSERT INTO lancamentos
      (tipo, descricao, categoria_id, conta_id, categoria, valor_centavos, data_vencimento, data_pagamento, status, observacoes, recorrencia_grupo)
    VALUES
      (@tipo, @descricao, @categoriaId, @contaId, @categoria, @valorCentavos, @dataVencimento, @dataPagamento, @status, @observacoes, @recorrenciaGrupo)
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
        conta_id = @contaId,
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

export function deleteLancamentosRecorrentes(item, escopo = 'SOMENTE_ESTE') {
  const db = getDb();
  if (!item.recorrenciaGrupo || escopo === 'SOMENTE_ESTE') return deleteLancamento(item.id);
  if (escopo === 'TODOS') {
    return db.prepare('DELETE FROM lancamentos WHERE recorrencia_grupo = ?').run(item.recorrenciaGrupo).changes;
  }
  if (escopo === 'PROXIMOS') {
    return db.prepare(`
      DELETE FROM lancamentos
      WHERE recorrencia_grupo = ?
        AND data_vencimento > ?
    `).run(item.recorrenciaGrupo, item.dataVencimento).changes;
  }
  return deleteLancamento(item.id);
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
    totalContas: totalSaldoContas(),
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

export function relatoriosEspecificos(filters) {
  const db = getDb();
  const previstosWhere = buildWhere(filters, 'data_vencimento');
  const realizadosWhere = buildWhere(
    { ...filters, status: filters.status === 'VENCIDO' ? filters.status : filters.status },
    'COALESCE(data_pagamento, data_vencimento)'
  );

  const previstos = db.prepare(`
    SELECT
      substr(data_vencimento, 1, 7) mes,
      SUM(CASE WHEN tipo = 'RECEBER' AND status = 'PENDENTE' THEN valor_centavos ELSE 0 END) receber_previsto,
      SUM(CASE WHEN tipo = 'PAGAR' AND status = 'PENDENTE' THEN valor_centavos ELSE 0 END) pagar_previsto
    FROM lancamentos
    ${previstosWhere.where}
    GROUP BY mes
  `).all(previstosWhere.params);

  const realizados = db.prepare(`
    SELECT
      substr(COALESCE(data_pagamento, data_vencimento), 1, 7) mes,
      SUM(CASE WHEN tipo = 'RECEBER' AND status = 'CONCLUIDO' THEN valor_centavos ELSE 0 END) receber_realizado,
      SUM(CASE WHEN tipo = 'PAGAR' AND status = 'CONCLUIDO' THEN valor_centavos ELSE 0 END) pagar_realizado
    FROM lancamentos
    ${realizadosWhere.where}
    GROUP BY mes
  `).all(realizadosWhere.params);

  const monthMap = new Map();
  previstos.forEach((row) => {
    monthMap.set(row.mes, {
      mes: row.mes,
      receberPrevisto: row.receber_previsto || 0,
      pagarPrevisto: row.pagar_previsto || 0,
      receberRealizado: 0,
      pagarRealizado: 0
    });
  });
  realizados.forEach((row) => {
    const current = monthMap.get(row.mes) || {
      mes: row.mes,
      receberPrevisto: 0,
      pagarPrevisto: 0,
      receberRealizado: 0,
      pagarRealizado: 0
    };
    current.receberRealizado = row.receber_realizado || 0;
    current.pagarRealizado = row.pagar_realizado || 0;
    monthMap.set(row.mes, current);
  });

  const mensal = [...monthMap.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map((row) => ({
    ...row,
    saldoPrevisto: row.receberPrevisto - row.pagarPrevisto,
    saldoRealizado: row.receberRealizado - row.pagarRealizado,
    diferencaReceber: row.receberRealizado - row.receberPrevisto,
    diferencaPagar: row.pagarRealizado - row.pagarPrevisto,
    diferencaSaldo: (row.receberRealizado - row.pagarRealizado) - (row.receberPrevisto - row.pagarPrevisto)
  }));

  const categoriaWhere = buildWhere(filters, 'data_vencimento');
  const categorias = db.prepare(`
    SELECT
      COALESCE(categoria, 'Sem categoria') categoria,
      SUM(CASE WHEN tipo = 'RECEBER' AND status = 'PENDENTE' THEN valor_centavos ELSE 0 END) receber_previsto,
      SUM(CASE WHEN tipo = 'PAGAR' AND status = 'PENDENTE' THEN valor_centavos ELSE 0 END) pagar_previsto,
      SUM(CASE WHEN tipo = 'RECEBER' AND status = 'CONCLUIDO' THEN valor_centavos ELSE 0 END) receber_realizado,
      SUM(CASE WHEN tipo = 'PAGAR' AND status = 'CONCLUIDO' THEN valor_centavos ELSE 0 END) pagar_realizado,
      COUNT(*) quantidade
    FROM lancamentos
    ${categoriaWhere.where}
    GROUP BY categoria
    ORDER BY categoria COLLATE NOCASE
  `).all(categoriaWhere.params).map((row) => ({
    categoria: row.categoria,
    receberPrevisto: row.receber_previsto || 0,
    pagarPrevisto: row.pagar_previsto || 0,
    receberRealizado: row.receber_realizado || 0,
    pagarRealizado: row.pagar_realizado || 0,
    saldoPrevisto: (row.receber_previsto || 0) - (row.pagar_previsto || 0),
    saldoRealizado: (row.receber_realizado || 0) - (row.pagar_realizado || 0),
    quantidade: row.quantidade || 0
  }));

  const recorrenciaFilters = { ...filters };
  delete recorrenciaFilters.status;
  const recorrenciaWhere = buildWhere(recorrenciaFilters, 'data_vencimento');
  const recorrenciaConnector = recorrenciaWhere.where ? 'AND' : 'WHERE';
  const recorrenciasFuturas = db.prepare(`
    SELECT
      recorrencia_grupo grupo,
      tipo,
      descricao,
      COALESCE(categoria, 'Sem categoria') categoria,
      COUNT(*) quantidade,
      MIN(data_vencimento) primeira_data,
      MAX(data_vencimento) ultima_data,
      SUM(valor_centavos) total,
      SUM(CASE WHEN status = 'PENDENTE' THEN valor_centavos ELSE 0 END) total_pendente
    FROM lancamentos
    ${recorrenciaWhere.where}
    ${recorrenciaConnector} recorrencia_grupo IS NOT NULL
      AND status = 'PENDENTE'
      AND data_vencimento >= @hoje
    GROUP BY recorrencia_grupo, tipo, descricao, categoria
    ORDER BY primeira_data ASC
  `).all({ ...recorrenciaWhere.params, hoje: todayISO() }).map((row) => ({
    grupo: row.grupo,
    tipo: row.tipo,
    descricao: row.descricao,
    categoria: row.categoria,
    quantidade: row.quantidade || 0,
    primeiraData: row.primeira_data,
    ultimaData: row.ultima_data,
    total: row.total || 0,
    totalPendente: row.total_pendente || 0
  }));

  return { mensal, categorias, recorrenciasFuturas };
}

export function relatorioLancamentos(filters) {
  const items = listAllLancamentos(filters);
  const totais = items.reduce((acc, item) => {
    if (item.tipo === 'RECEBER') {
      acc.totalReceber += item.valorCentavos;
      if (item.status === 'PENDENTE') acc.receberPendente += item.valorCentavos;
      if (item.status === 'CONCLUIDO') acc.recebido += item.valorCentavos;
    }
    if (item.tipo === 'PAGAR') {
      acc.totalPagar += item.valorCentavos;
      if (item.status === 'PENDENTE') acc.pagarPendente += item.valorCentavos;
      if (item.status === 'CONCLUIDO') acc.pago += item.valorCentavos;
    }
    acc.quantidade += 1;
    acc[item.status.toLowerCase()] = (acc[item.status.toLowerCase()] || 0) + 1;
    return acc;
  }, {
    totalReceber: 0,
    totalPagar: 0,
    receberPendente: 0,
    pagarPendente: 0,
    recebido: 0,
    pago: 0,
    pendente: 0,
    concluido: 0,
    cancelado: 0,
    quantidade: 0
  });

  totais.saldoPrevisto = totais.receberPendente - totais.pagarPendente;
  totais.saldoRealizado = totais.recebido - totais.pago;
  totais.saldoGeral = totais.totalReceber - totais.totalPagar;

  return { items, totais };
}
