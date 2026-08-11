import { AppError } from '../utils/AppError.js';
import {
  createAporte,
  createMeta,
  deleteMeta,
  getMetaById,
  listAportes,
  listMetas,
  updateMeta
} from '../repositories/metaRepository.js';
import { getContaById } from '../repositories/contaRepository.js';

function normalize(payload) {
  const contaId = payload.contaId || null;
  if (contaId && !getContaById(contaId)) {
    throw new AppError('Conta selecionada nao encontrada.', 404);
  }
  return {
    nome: payload.nome,
    valorAlvoCentavos: payload.valorAlvo,
    valorAtualCentavos: payload.valorAtual || 0,
    dataAlvo: payload.dataAlvo || null,
    cor: payload.cor || null,
    contaId,
    status: payload.status || 'EM_ANDAMENTO',
    observacoes: payload.observacoes || null
  };
}

export function listarMetas() {
  return listMetas();
}

export function buscarMeta(id) {
  const meta = getMetaById(id);
  if (!meta) throw new AppError('Meta nao encontrada.', 404);
  return meta;
}

export function criarMeta(payload) {
  return createMeta(normalize(payload));
}

export function editarMeta(id, payload) {
  buscarMeta(id);
  return updateMeta(id, normalize(payload));
}

export function excluirMeta(id) {
  buscarMeta(id);
  deleteMeta(id);
}

export function listarAportes(metaId) {
  buscarMeta(metaId);
  return listAportes(metaId);
}

export function registrarAporte(metaId, payload) {
  const meta = buscarMeta(metaId);
  const atualizada = createAporte(metaId, {
    data: payload.data,
    valorCentavos: payload.valor,
    observacoes: payload.observacoes || null
  });
  if (atualizada.valorAtualCentavos >= atualizada.valorAlvoCentavos && meta.status === 'EM_ANDAMENTO') {
    return updateMeta(metaId, { ...atualizada, status: 'CONCLUIDA' });
  }
  return atualizada;
}
