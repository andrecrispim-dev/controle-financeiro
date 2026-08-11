import crypto from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { addDaysISO, addMonthsISO, monthRangeISO } from '../utils/dateUtils.js';
import { getCategoriaById } from '../repositories/categoriaRepository.js';
import { getContaById } from '../repositories/contaRepository.js';
import { createLancamento } from '../repositories/lancamentoRepository.js';
import {
  createFeriado,
  createManyPlantoes,
  createPlantao,
  createVinculoLancamento,
  deleteFeriado,
  deleteLancamentoPlantao,
  deletePlantao,
  deletePlantoesRecorrentes,
  existsPlantaoMesmoTurno,
  getFeriadoById,
  getPlantaoById,
  getPlantaoValor,
  getVinculoLancamento,
  isFeriado,
  listFeriados,
  listPlantaoValores,
  listPlantoes,
  listPlantoesRecorrentesAfetados,
  listResumoMes,
  resumoHospitalMes,
  transaction,
  updateFeriado,
  updateLancamentoPlantao,
  updatePlantao,
  updatePlantaoValor,
  syncValorLancamentoPlantao
} from '../repositories/plantaoRepository.js';

const HOSPITAIS = ['UNIMED', 'IPIS'];
const HORARIOS = {
  DIURNO: { inicio: '07:00', fim: '13:00', horas: 6 },
  TARDE: { inicio: '13:00', fim: '19:00', horas: 6 },
  NOTURNO: { inicio: '19:00', fim: '07:00', horas: 12 },
  ESPECIAL: { inicio: '19:00', fim: '01:00', horas: 6 }
};

function mesFromDate(data) {
  return data.slice(0, 7);
}

function dayOfWeek(data) {
  const [year, month, day] = data.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isWeekend(data) {
  const weekDay = dayOfWeek(data);
  return weekDay === 0 || weekDay === 6;
}

function useWeekendValue(data, tipo, feriado) {
  const weekDay = dayOfWeek(data);
  const fridayNight = weekDay === 5 && ['NOTURNO', 'ESPECIAL'].includes(tipo);
  return feriado || isWeekend(data) || fridayNight;
}

function mapResumo(row, mes, db) {
  const vinculo = getVinculoLancamento(row.hospital, mes, db);
  return {
    hospital: row.hospital,
    mes,
    quantidade: row.quantidade || 0,
    horas: row.horas || 0,
    extras: row.extras || 0,
    totalBaseCentavos: row.total_base || 0,
    totalExtrasCentavos: row.total_extras || 0,
    totalCentavos: row.total || 0,
    lancamento: vinculo
  };
}

function ensureCategoriaConta(payload) {
  const categoria = payload.categoriaId ? getCategoriaById(payload.categoriaId) : null;
  if (payload.categoriaId && !categoria) throw new AppError('Categoria nao encontrada.', 404);
  const conta = payload.contaId ? getContaById(payload.contaId) : null;
  if (payload.contaId && !conta) throw new AppError('Conta bancaria nao encontrada.', 404);
  return { categoria, conta };
}

function calculatePlantao(payload, db) {
  const feriado = isFeriado(payload.data, db);
  const fimSemana = isWeekend(payload.data);
  const usaFimSemana = useWeekendValue(payload.data, payload.tipo, feriado);
  const contexto = usaFimSemana ? 'FIM_SEMANA_FERIADO' : 'SEMANA';
  const valor = getPlantaoValor(payload.tipo, contexto, db);
  if (!valor) throw new AppError('Valor de plantao nao configurado.', 400);
  const horario = HORARIOS[payload.tipo];
  const quantidadeExtras = payload.quantidadeExtras || 0;
  const valorExtrasCentavos = quantidadeExtras * valor.valorExtraCentavos;
  return {
    data: payload.data,
    hospital: payload.hospital,
    tipo: payload.tipo,
    horaInicio: horario.inicio,
    horaFim: horario.fim,
    quantidadeHoras: horario.horas,
    quantidadeExtras,
    valorBaseCentavos: valor.valorBaseCentavos,
    valorExtraUnitarioCentavos: valor.valorExtraCentavos,
    valorExtrasCentavos,
    valorTotalCentavos: valor.valorBaseCentavos + valorExtrasCentavos,
    ehFeriado: feriado ? 1 : 0,
    ehFimSemana: fimSemana ? 1 : 0,
    usaValorFimSemana: usaFimSemana ? 1 : 0,
    recorrenciaGrupo: payload.recorrenciaGrupo || null,
    recorrenciaTipo: payload.recorrenciaTipo || null,
    observacoes: payload.observacoes || null
  };
}

function assertTurnoDisponivel(payload, ignoreId, db) {
  if (existsPlantaoMesmoTurno(payload.data, payload.tipo, ignoreId, db)) {
    throw new AppError('Ja existe um plantao deste turno cadastrado neste dia.', 409, [
      { field: 'tipo', message: 'Nao e permitido cadastrar dois plantoes do mesmo turno no mesmo dia.' }
    ]);
  }
}

function assertCanSyncConcluido(hospital, mes, confirmar, db) {
  const vinculo = getVinculoLancamento(hospital, mes, db);
  if (vinculo?.lancamentoStatus === 'CONCLUIDO' && !confirmar) {
    throw new AppError('O lancamento financeiro deste hospital/mes ja esta concluido. Confirme para atualizar o valor.', 409, [
      { field: 'confirmarAtualizacaoConcluido', message: 'Confirmacao obrigatoria para atualizar lancamento concluido.' }
    ]);
  }
  return vinculo;
}

function syncLancamentoExistente(hospital, mes, db) {
  const vinculo = getVinculoLancamento(hospital, mes, db);
  if (!vinculo) return null;
  const resumo = resumoHospitalMes(hospital, mes, db);
  const valorCentavos = resumo?.total || 0;
  if (valorCentavos <= 0) {
    deleteLancamentoPlantao(vinculo.lancamentoId, db);
    return null;
  }
  syncValorLancamentoPlantao(vinculo.lancamentoId, {
    descricao: `Plantoes ${hospital} - ${mes}`,
    valorCentavos,
    observacoes: `Lancamento sincronizado automaticamente a partir do calendario de plantoes. Total calculado: ${valorCentavos} centavos.`
  }, db);
  return getVinculoLancamento(hospital, mes, db);
}

function buildDatasRecorrencia(dataInicial, recorrencia) {
  const frequencia = recorrencia?.frequencia || 'NAO_REPETIR';
  if (frequencia === 'NAO_REPETIR') return [dataInicial];
  const step = {
    SEMANAL: (date) => addDaysISO(date, 7),
    QUINZENAL: (date) => addDaysISO(date, 15),
    MENSAL: (date) => addMonthsISO(date, 1)
  }[frequencia];
  const dataFinal = addMonthsISO(dataInicial, 36);
  const datas = [];
  let current = dataInicial;
  while (current <= dataFinal) {
    datas.push(current);
    current = step(current);
  }
  return datas;
}

function syncMesesAfetados(items, db) {
  const chaves = new Set(items.map((item) => `${item.hospital}|${mesFromDate(item.data)}`));
  chaves.forEach((chave) => {
    const [hospital, mes] = chave.split('|');
    syncLancamentoExistente(hospital, mes, db);
  });
}

export function listarPlantoes(filters) {
  const mes = filters.mes || filters.dataInicial?.slice(0, 7) || monthRangeISO().start.slice(0, 7);
  const items = listPlantoes({ ...filters, mes });
  const resumoRows = listResumoMes(mes);
  const resumo = HOSPITAIS.map((hospital) => {
    const row = resumoRows.find((item) => item.hospital === hospital) || {
      hospital, quantidade: 0, horas: 0, extras: 0, total_base: 0, total_extras: 0, total: 0
    };
    return mapResumo(row, mes);
  });
  return { items, resumo, valores: listPlantaoValores(), feriados: listFeriados() };
}

export function criarPlantao(payload) {
  return transaction((db) => {
    const datas = buildDatasRecorrencia(payload.data, payload.recorrencia);
    const grupo = datas.length > 1 ? crypto.randomUUID() : null;
    const registros = datas.map((data) => ({
      ...payload,
      data,
      recorrenciaGrupo: grupo,
      recorrenciaTipo: payload.recorrencia?.frequencia || null
    }));
    const meses = new Set(registros.map((item) => `${item.hospital}|${mesFromDate(item.data)}`));
    meses.forEach((chave) => {
      const [hospital, mes] = chave.split('|');
      assertCanSyncConcluido(hospital, mes, payload.confirmarAtualizacaoConcluido, db);
    });
    registros.forEach((item) => assertTurnoDisponivel(item, null, db));
    const calculated = registros.map((item) => calculatePlantao(item, db));
    const created = calculated.length === 1 ? [createPlantao(calculated[0], db)] : createManyPlantoes(calculated, db);
    syncMesesAfetados(created, db);
    return created.length === 1 ? created[0] : created;
  });
}

export function editarPlantao(id, payload) {
  return transaction((db) => {
    const current = getPlantaoById(id);
    if (!current) throw new AppError('Plantao nao encontrado.', 404);
    const mesesAfetados = new Set([mesFromDate(current.data), mesFromDate(payload.data)]);
    const hospitaisAfetados = new Set([current.hospital, payload.hospital]);
    hospitaisAfetados.forEach((hospital) => {
      mesesAfetados.forEach((mes) => assertCanSyncConcluido(hospital, mes, payload.confirmarAtualizacaoConcluido, db));
    });
    assertTurnoDisponivel(payload, id, db);
    const updated = updatePlantao(id, calculatePlantao({
      ...payload,
      recorrenciaGrupo: current.recorrenciaGrupo,
      recorrenciaTipo: current.recorrenciaTipo
    }, db), db);
    hospitaisAfetados.forEach((hospital) => {
      mesesAfetados.forEach((mes) => syncLancamentoExistente(hospital, mes, db));
    });
    return updated;
  });
}

export function excluirPlantao(id, options = {}) {
  return transaction((db) => {
    const current = getPlantaoById(id);
    if (!current) throw new AppError('Plantao nao encontrado.', 404);
    const escopo = options.escopo || 'SOMENTE_ESTE';
    const afetados = listPlantoesRecorrentesAfetados(current, escopo, db);
    afetados.forEach((item) => assertCanSyncConcluido(item.hospital, mesFromDate(item.data), options.confirmarAtualizacaoConcluido, db));
    if (escopo === 'SOMENTE_ESTE') deletePlantao(id, db);
    else deletePlantoesRecorrentes(current, escopo, db);
    syncMesesAfetados(afetados, db);
  });
}

export function lancarPlantoes(payload) {
  return transaction((db) => {
    const resumo = resumoHospitalMes(payload.hospital, payload.mes, db);
    if (!resumo || !resumo.total) throw new AppError('Nao existem plantoes para este hospital no mes selecionado.', 400);
    const vinculo = assertCanSyncConcluido(payload.hospital, payload.mes, payload.confirmarAtualizacaoConcluido, db);
    const { categoria } = ensureCategoriaConta(payload);
    const data = {
      tipo: 'RECEBER',
      descricao: `Plantoes ${payload.hospital} - ${payload.mes}`,
      categoriaId: payload.categoriaId || null,
      contaId: payload.contaId || null,
      categoria: categoria?.nome || null,
      valorCentavos: resumo.total,
      dataVencimento: payload.dataVencimento,
      dataPagamento: null,
      status: 'PENDENTE',
      observacoes: `Lancamento unico dos plantoes de ${payload.hospital} em ${payload.mes}.`
    };
    if (vinculo) {
      updateLancamentoPlantao(vinculo.lancamentoId, data, db);
      return getVinculoLancamento(payload.hospital, payload.mes, db);
    }
    const lancamento = createLancamento(data, db);
    createVinculoLancamento({ hospital: payload.hospital, mes: payload.mes, lancamentoId: lancamento.id }, db);
    return getVinculoLancamento(payload.hospital, payload.mes, db);
  });
}

export function listarValoresPlantao() {
  return listPlantaoValores();
}

export function editarValorPlantao(id, payload) {
  const updated = updatePlantaoValor(id, {
    valorBaseCentavos: payload.valorBase,
    valorExtraCentavos: payload.valorExtra
  });
  if (!updated) throw new AppError('Valor de plantao nao encontrado.', 404);
  return updated;
}

export function listarFeriados() {
  return listFeriados();
}

export function criarFeriado(payload) {
  return createFeriado(payload);
}

export function editarFeriado(id, payload) {
  if (!getFeriadoById(id)) throw new AppError('Feriado nao encontrado.', 404);
  return updateFeriado(id, payload);
}

export function excluirFeriado(id) {
  if (!getFeriadoById(id)) throw new AppError('Feriado nao encontrado.', 404);
  deleteFeriado(id);
}
