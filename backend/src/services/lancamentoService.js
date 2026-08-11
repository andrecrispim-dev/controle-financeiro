import { AppError } from '../utils/AppError.js';
import { addDaysISO, addMonthsISO, todayISO } from '../utils/dateUtils.js';
import {
  createLancamento,
  createManyLancamentos,
  deleteLancamento,
  deleteLancamentosRecorrentes,
  getLancamentoById,
  listAllLancamentos,
  listLancamentos,
  setStatus,
  updateLancamento
} from '../repositories/lancamentoRepository.js';
import { getCategoriaById } from '../repositories/categoriaRepository.js';
import { getContaById } from '../repositories/contaRepository.js';

function normalizePayload(payload) {
  const categoria = payload.categoriaId ? getCategoriaById(payload.categoriaId) : null;
  if (payload.categoriaId && !categoria) throw new AppError('Categoria nao encontrada.', 404);
  const conta = payload.contaId ? getContaById(payload.contaId) : null;
  if (payload.contaId && !conta) throw new AppError('Conta bancaria nao encontrada.', 404);
  return {
    tipo: payload.tipo,
    descricao: payload.descricao,
    categoriaId: payload.categoriaId || null,
    contaId: payload.contaId || null,
    categoria: categoria?.nome || payload.categoria || null,
    valorCentavos: payload.valor,
    dataVencimento: payload.dataVencimento,
    dataPagamento: payload.dataPagamento || null,
    status: payload.status,
    observacoes: payload.observacoes || null
  };
}

function buildRecorrencias(base, recorrencia) {
  const tipoRecorrencia = recorrencia?.tipo && recorrencia.tipo !== 'NAO_REPETIR'
    ? recorrencia.tipo
    : (recorrencia?.frequencia && recorrencia.frequencia !== 'NAO_REPETIR' ? 'PARCELADA' : 'NAO_REPETIR');
  if (!recorrencia || tipoRecorrencia === 'NAO_REPETIR') return [base];
  const frequencia = tipoRecorrencia === 'FIXA' ? 'MENSAL' : (recorrencia.frequencia || 'MENSAL');
  if (frequencia === 'NAO_REPETIR') return [base];
  const step = {
    SEMANAL: (date) => addDaysISO(date, 7),
    QUINZENAL: (date) => addDaysISO(date, 15),
    MENSAL: (date) => addMonthsISO(date, 1),
    ANUAL: (date) => addMonthsISO(date, 12)
  }[frequencia];
  const limite = tipoRecorrencia === 'FIXA' ? 36 : (recorrencia.quantidade || 12);
  const final = recorrencia.dataFinal || null;
  const items = [];
  let current = base.dataVencimento;
  for (let index = 0; index < limite; index += 1) {
    if (final && current > final) break;
    const item = { ...base, dataVencimento: current };
    if (index > 0 && base.status === 'CONCLUIDO') {
      item.status = 'PENDENTE';
      item.dataPagamento = null;
    }
    items.push(item);
    current = step(current);
  }
  return items;
}

export function criarLancamento(payload) {
  const base = normalizePayload(payload);
  const items = buildRecorrencias(base, payload.recorrencia);
  return items.length === 1 ? [createLancamento(items[0])] : createManyLancamentos(items);
}

export function listarLancamentos(filters) {
  return listLancamentos(filters);
}

export function buscarLancamento(id) {
  const item = getLancamentoById(id);
  if (!item) throw new AppError('Lancamento nao encontrado.', 404);
  return item;
}

export function editarLancamento(id, payload) {
  buscarLancamento(id);
  return updateLancamento(id, normalizePayload(payload));
}

export function excluirLancamento(id, escopo = 'SOMENTE_ESTE') {
  const item = buscarLancamento(id);
  deleteLancamentosRecorrentes(item, escopo);
}

export function concluirLancamento(id, payload) {
  const item = buscarLancamento(id);
  if (item.status === 'CONCLUIDO') return item;
  return setStatus(id, 'CONCLUIDO', payload.dataPagamento || todayISO());
}

export function reabrirLancamento(id) {
  buscarLancamento(id);
  return setStatus(id, 'PENDENTE', null);
}

export function cancelarLancamento(id) {
  buscarLancamento(id);
  return setStatus(id, 'CANCELADO', null);
}

export function listarTodosParaExportacao(filters) {
  return listAllLancamentos(filters);
}
