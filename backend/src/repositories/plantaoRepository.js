import { getDb } from '../database/db.js';

function mapPlantao(row) {
  if (!row) return null;
  return {
    id: row.id,
    data: row.data,
    hospital: row.hospital,
    tipo: row.tipo,
    horaInicio: row.hora_inicio,
    horaFim: row.hora_fim,
    quantidadeHoras: row.quantidade_horas,
    quantidadeExtras: row.quantidade_extras,
    valorBaseCentavos: row.valor_base_centavos,
    valorExtraUnitarioCentavos: row.valor_extra_unitario_centavos,
    valorExtrasCentavos: row.valor_extras_centavos,
    valorTotalCentavos: row.valor_total_centavos,
    ehFeriado: Boolean(row.eh_feriado),
    ehFimSemana: Boolean(row.eh_fim_semana),
    usaValorFimSemana: Boolean(row.usa_valor_fim_semana),
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapValor(row) {
  if (!row) return null;
  return {
    id: row.id,
    tipo: row.tipo,
    contexto: row.contexto,
    valorBaseCentavos: row.valor_base_centavos,
    valorExtraCentavos: row.valor_extra_centavos,
    ativo: Boolean(row.ativo),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFeriado(row) {
  if (!row) return null;
  return {
    id: row.id,
    data: row.data,
    nome: row.nome,
    tipo: row.tipo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapVinculo(row) {
  if (!row) return null;
  return {
    id: row.id,
    hospital: row.hospital,
    mes: row.ano_mes,
    lancamentoId: row.lancamento_id,
    lancamentoStatus: row.status,
    lancamentoValorCentavos: row.valor_centavos,
    lancamentoDescricao: row.descricao,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getPeriodoFromFilters(filters = {}) {
  if (filters.mes) return { start: `${filters.mes}-01`, end: `${filters.mes}-31` };
  return { start: filters.dataInicial, end: filters.dataFinal };
}

export function listPlantoes(filters = {}) {
  const db = getDb();
  const clauses = [];
  const params = {};
  if (filters.mes) {
    clauses.push('substr(data, 1, 7) = @mes');
    params.mes = filters.mes;
  }
  if (filters.dataInicial) {
    clauses.push('data >= @dataInicial');
    params.dataInicial = filters.dataInicial;
  }
  if (filters.dataFinal) {
    clauses.push('data <= @dataFinal');
    params.dataFinal = filters.dataFinal;
  }
  if (filters.hospital) {
    clauses.push('hospital = @hospital');
    params.hospital = filters.hospital;
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.prepare(`
    SELECT *
    FROM plantoes
    ${where}
    ORDER BY data ASC,
      CASE tipo WHEN 'DIURNO' THEN 1 WHEN 'TARDE' THEN 2 WHEN 'ESPECIAL' THEN 3 WHEN 'NOTURNO' THEN 4 ELSE 5 END,
      id ASC
  `).all(params).map(mapPlantao);
}

export function getPlantaoById(id) {
  return mapPlantao(getDb().prepare('SELECT * FROM plantoes WHERE id = ?').get(id));
}

export function createPlantao(data, db = getDb()) {
  const result = db.prepare(`
    INSERT INTO plantoes (
      data, hospital, tipo, hora_inicio, hora_fim, quantidade_horas, quantidade_extras,
      valor_base_centavos, valor_extra_unitario_centavos, valor_extras_centavos, valor_total_centavos,
      eh_feriado, eh_fim_semana, usa_valor_fim_semana, observacoes
    ) VALUES (
      @data, @hospital, @tipo, @horaInicio, @horaFim, @quantidadeHoras, @quantidadeExtras,
      @valorBaseCentavos, @valorExtraUnitarioCentavos, @valorExtrasCentavos, @valorTotalCentavos,
      @ehFeriado, @ehFimSemana, @usaValorFimSemana, @observacoes
    )
  `).run(data);
  return getPlantaoById(result.lastInsertRowid);
}

export function updatePlantao(id, data, db = getDb()) {
  db.prepare(`
    UPDATE plantoes
    SET data = @data,
        hospital = @hospital,
        tipo = @tipo,
        hora_inicio = @horaInicio,
        hora_fim = @horaFim,
        quantidade_horas = @quantidadeHoras,
        quantidade_extras = @quantidadeExtras,
        valor_base_centavos = @valorBaseCentavos,
        valor_extra_unitario_centavos = @valorExtraUnitarioCentavos,
        valor_extras_centavos = @valorExtrasCentavos,
        valor_total_centavos = @valorTotalCentavos,
        eh_feriado = @ehFeriado,
        eh_fim_semana = @ehFimSemana,
        usa_valor_fim_semana = @usaValorFimSemana,
        observacoes = @observacoes,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return getPlantaoById(id);
}

export function deletePlantao(id, db = getDb()) {
  return db.prepare('DELETE FROM plantoes WHERE id = ?').run(id).changes;
}

export function getPlantaoValor(tipo, contexto, db = getDb()) {
  return mapValor(db.prepare('SELECT * FROM plantao_valores WHERE tipo = ? AND contexto = ? AND ativo = 1').get(tipo, contexto));
}

export function listPlantaoValores() {
  return getDb().prepare(`
    SELECT *
    FROM plantao_valores
    ORDER BY contexto ASC,
      CASE tipo WHEN 'DIURNO' THEN 1 WHEN 'TARDE' THEN 2 WHEN 'NOTURNO' THEN 3 WHEN 'ESPECIAL' THEN 4 ELSE 5 END
  `).all().map(mapValor);
}

export function updatePlantaoValor(id, data) {
  getDb().prepare(`
    UPDATE plantao_valores
    SET valor_base_centavos = @valorBaseCentavos,
        valor_extra_centavos = @valorExtraCentavos,
        updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return mapValor(getDb().prepare('SELECT * FROM plantao_valores WHERE id = ?').get(id));
}

export function isFeriado(data, db = getDb()) {
  return Boolean(db.prepare('SELECT 1 FROM feriados WHERE data = ?').get(data));
}

export function listFeriados() {
  return getDb().prepare('SELECT * FROM feriados ORDER BY data ASC').all().map(mapFeriado);
}

export function getFeriadoById(id) {
  return mapFeriado(getDb().prepare('SELECT * FROM feriados WHERE id = ?').get(id));
}

export function createFeriado(data) {
  const result = getDb().prepare('INSERT INTO feriados (data, nome, tipo) VALUES (@data, @nome, @tipo)').run(data);
  return getFeriadoById(result.lastInsertRowid);
}

export function updateFeriado(id, data) {
  getDb().prepare(`
    UPDATE feriados
    SET data = @data, nome = @nome, tipo = @tipo, updated_at = datetime('now')
    WHERE id = @id
  `).run({ ...data, id });
  return getFeriadoById(id);
}

export function deleteFeriado(id) {
  return getDb().prepare('DELETE FROM feriados WHERE id = ?').run(id).changes;
}

export function resumoHospitalMes(hospital, mes, db = getDb()) {
  return db.prepare(`
    SELECT
      hospital,
      substr(data, 1, 7) mes,
      COUNT(*) quantidade,
      SUM(quantidade_horas) horas,
      SUM(quantidade_extras) extras,
      SUM(valor_base_centavos) total_base,
      SUM(valor_extras_centavos) total_extras,
      SUM(valor_total_centavos) total
    FROM plantoes
    WHERE hospital = ? AND substr(data, 1, 7) = ?
    GROUP BY hospital, substr(data, 1, 7)
  `).get(hospital, mes);
}

export function listResumoMes(mes, db = getDb()) {
  return db.prepare(`
    SELECT
      hospital,
      substr(data, 1, 7) mes,
      COUNT(*) quantidade,
      SUM(quantidade_horas) horas,
      SUM(quantidade_extras) extras,
      SUM(valor_base_centavos) total_base,
      SUM(valor_extras_centavos) total_extras,
      SUM(valor_total_centavos) total
    FROM plantoes
    WHERE substr(data, 1, 7) = ?
    GROUP BY hospital, substr(data, 1, 7)
    ORDER BY hospital ASC
  `).all(mes);
}

export function getVinculoLancamento(hospital, mes, db = getDb()) {
  return mapVinculo(db.prepare(`
    SELECT pl.*, l.status, l.valor_centavos, l.descricao
    FROM plantao_lancamentos pl
    JOIN lancamentos l ON l.id = pl.lancamento_id
    WHERE pl.hospital = ? AND pl.ano_mes = ?
  `).get(hospital, mes));
}

export function createVinculoLancamento(data, db = getDb()) {
  const result = db.prepare(`
    INSERT INTO plantao_lancamentos (hospital, ano_mes, lancamento_id)
    VALUES (@hospital, @mes, @lancamentoId)
  `).run(data);
  return result.lastInsertRowid;
}

export function updateLancamentoPlantao(lancamentoId, data, db = getDb()) {
  db.prepare(`
    UPDATE lancamentos
    SET descricao = @descricao,
        categoria_id = @categoriaId,
        conta_id = @contaId,
        categoria = @categoria,
        valor_centavos = @valorCentavos,
        data_vencimento = @dataVencimento,
        observacoes = @observacoes,
        updated_at = datetime('now')
    WHERE id = @lancamentoId
  `).run({ ...data, lancamentoId });
}

export function syncValorLancamentoPlantao(lancamentoId, data, db = getDb()) {
  db.prepare(`
    UPDATE lancamentos
    SET descricao = @descricao,
        valor_centavos = @valorCentavos,
        observacoes = @observacoes,
        updated_at = datetime('now')
    WHERE id = @lancamentoId
  `).run({ ...data, lancamentoId });
}

export function deleteLancamentoPlantao(lancamentoId, db = getDb()) {
  db.prepare('DELETE FROM lancamentos WHERE id = ?').run(lancamentoId);
}

export function transaction(callback) {
  const db = getDb();
  return db.transaction(callback)(db);
}
