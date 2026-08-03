import { AppError } from '../utils/AppError.js';
import {
  contaEmUso,
  createConta,
  deleteConta,
  getContaById,
  listContas,
  listContasAtivas,
  updateConta
} from '../repositories/contaRepository.js';
import { getBancoById } from '../repositories/bancoRepository.js';

function normalize(payload) {
  const bancoId = payload.bancoId || null;
  const banco = bancoId ? getBancoById(bancoId) : null;
  if (bancoId && !banco) {
    throw new AppError('Banco selecionado nao encontrado.', 404);
  }

  return {
    nome: payload.nome,
    bancoId,
    banco: banco?.nome || payload.banco || null,
    agencia: payload.agencia || null,
    numero: payload.numero || null,
    saldoInicialCentavos: payload.saldoInicial || 0,
    ativa: payload.ativa ? 1 : 0,
    observacoes: payload.observacoes || null
  };
}

export function listarContas({ somenteAtivas = false } = {}) {
  return somenteAtivas ? listContasAtivas() : listContas();
}

export function buscarConta(id) {
  const conta = getContaById(id);
  if (!conta) throw new AppError('Conta bancaria nao encontrada.', 404);
  return conta;
}

export function criarConta(payload) {
  try {
    return createConta(normalize(payload));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError('Ja existe uma conta com esse nome.', 409);
    }
    throw error;
  }
}

export function editarConta(id, payload) {
  buscarConta(id);
  try {
    return updateConta(id, normalize(payload));
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new AppError('Ja existe uma conta com esse nome.', 409);
    }
    throw error;
  }
}

export function excluirConta(id) {
  buscarConta(id);
  if (contaEmUso(id)) {
    throw new AppError('Nao e possivel excluir uma conta vinculada a lancamentos.', 409);
  }
  deleteConta(id);
}
