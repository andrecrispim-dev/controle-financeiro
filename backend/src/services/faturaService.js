import { getDb } from '../database/db.js';
import { createFaturaComItens, deleteFatura, gastosPorCategoria, getFaturaDetalhada, listFaturaItens, listFaturas, updateFaturaItemCategoria } from '../repositories/faturaRepository.js';
import { createLancamento } from '../repositories/lancamentoRepository.js';
import { getCategoriaById } from '../repositories/categoriaRepository.js';
import { getContaById } from '../repositories/contaRepository.js';
import { AppError } from '../utils/AppError.js';
import { parseFaturaPdf } from '../utils/faturaParser.js';

export async function analisarFatura(file) {
  return parseFaturaPdf(file.buffer);
}

function inferDataCompra(dataOriginal, dataVencimento) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataOriginal || '')) return dataOriginal;
  const match = /^(\d{2})\/(\d{2})$/.exec(dataOriginal || '');
  if (!match || !dataVencimento) return dataVencimento;

  const [, day, month] = match;
  const [dueYear, dueMonth] = dataVencimento.split('-').map(Number);
  const itemMonth = Number(month);
  const year = itemMonth < dueMonth - 1 ? dueYear + 1 : dueYear;
  return `${year}-${month}-${day}`;
}

function lastCardDigits(value) {
  return String(value || '').match(/(\d{4})$/)?.[1] || null;
}

function normalizeItem(item, dataVencimento) {
  const categoria = item.categoriaId ? getCategoriaById(item.categoriaId) : null;
  if (item.categoriaId && !categoria) throw new AppError('Categoria de um item da fatura nao encontrada.', 404);
  return {
    categoriaId: item.categoriaId || null,
    categoriaImportada: item.categoriaId ? null : item.categoria || 'Sem categoria',
    dataCompra: inferDataCompra(item.data, dataVencimento),
    dataOriginal: item.data,
    descricao: item.descricao,
    cidade: item.cidade || null,
    valorCentavos: item.valorCentavos,
    tipo: item.tipo,
    parcela: item.parcela || null,
    cartaoTitular: item.cartaoTitular || null,
    cartaoFinal: item.cartaoFinal || null,
    ambiguo: item.ambiguo ? 1 : 0,
    moeda: item.moeda || null
  };
}

export function confirmarFatura(payload) {
  const categoria = payload.categoriaId ? getCategoriaById(payload.categoriaId) : null;
  if (payload.categoriaId && !categoria) throw new AppError('Categoria nao encontrada.', 404);
  const conta = getContaById(payload.contaId);
  if (!conta) throw new AppError('Conta bancaria nao encontrada.', 404);

  const db = getDb();
  const tx = db.transaction(() => {
    const lancamento = createLancamento({
      tipo: 'PAGAR',
      descricao: payload.descricao,
      categoriaId: payload.categoriaId || null,
      contaId: payload.contaId,
      categoria: categoria?.nome || null,
      valorCentavos: payload.valorCentavos,
      dataVencimento: payload.dataVencimento,
      dataPagamento: null,
      status: 'PENDENTE',
      observacoes: payload.observacoes || null
    }, db);

    const itens = payload.itens.map((item) => normalizeItem(item, payload.dataVencimento));
    const somaItensCentavos = itens.reduce((sum, item) => sum + item.valorCentavos, 0);
    const fatura = createFaturaComItens({
      lancamentoId: lancamento.id,
      banco: payload.banco || 'Bradesco',
      descricao: payload.descricao,
      valorTotalCentavos: payload.valorCentavos,
      dataVencimento: payload.dataVencimento,
      arquivoNome: payload.arquivoNome || null,
      quantidadeItens: itens.length,
      somaItensCentavos
    }, itens, db);

    return { lancamento, fatura };
  });

  return tx();
}

export function listarFaturas() {
  return listFaturas();
}

export function buscarFatura(id) {
  const fatura = getFaturaDetalhada(id);
  if (!fatura) throw new AppError('Fatura nao encontrada.', 404);
  return fatura;
}

export function excluirFatura(id) {
  const changes = deleteFatura(id);
  if (!changes) throw new AppError('Fatura nao encontrada.', 404);
}

export function listarItensFatura(filters) {
  return listFaturaItens(filters);
}

export function atualizarCategoriaItem(id, categoriaId) {
  if (categoriaId) {
    const categoria = getCategoriaById(categoriaId);
    if (!categoria) throw new AppError('Categoria nao encontrada.', 404);
  }
  const item = updateFaturaItemCategoria(id, categoriaId || null);
  if (!item) throw new AppError('Item da fatura nao encontrado.', 404);
  return item;
}

export function relatorioGastosPorCategoria(filters) {
  return gastosPorCategoria(filters);
}

export function prepararItensConfirmacao(fatura) {
  return fatura.grupos.flatMap((grupo) => grupo.itens.map((item) => ({
    ...item,
    cartaoTitular: grupo.titular,
    cartaoFinal: lastCardDigits(grupo.cartao)
  })));
}
