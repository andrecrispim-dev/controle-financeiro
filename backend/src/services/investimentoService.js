import { AppError } from '../utils/AppError.js';
import {
  createInvestimento,
  createInvestimentosBulk,
  deleteInvestimento,
  getInvestimentoById,
  listInvestimentos,
  updateInvestimento
} from '../repositories/investimentoRepository.js';
import { parseCsv } from '../utils/csv.js';
import { isDateISO } from '../utils/dateUtils.js';

const CLASSES_VALIDAS = ['RENDA_FIXA', 'RENDA_VARIAVEL', 'FUNDO', 'IMOVEL', 'EXTERIOR', 'OUTRO'];

function normalize(payload) {
  return {
    ativo: payload.ativo,
    classe: payload.classe,
    instituicao: payload.instituicao || null,
    valorInvestidoCentavos: payload.valorInvestido,
    valorAtualCentavos: payload.valorAtual,
    dataAplicacao: payload.dataAplicacao,
    origem: 'MANUAL',
    observacoes: payload.observacoes || null
  };
}

function rentabilidadeDe(investidoCentavos, atualCentavos) {
  return investidoCentavos > 0 ? (atualCentavos - investidoCentavos) / investidoCentavos : 0;
}

export function listarInvestimentos() {
  const items = listInvestimentos();
  const totalInvestidoCentavos = items.reduce((sum, item) => sum + item.valorInvestidoCentavos, 0);
  const totalAtualCentavos = items.reduce((sum, item) => sum + item.valorAtualCentavos, 0);

  const porClasseMap = new Map();
  items.forEach((item) => {
    const atual = porClasseMap.get(item.classe) || {
      classe: item.classe,
      quantidade: 0,
      totalInvestidoCentavos: 0,
      totalAtualCentavos: 0
    };
    atual.quantidade += 1;
    atual.totalInvestidoCentavos += item.valorInvestidoCentavos;
    atual.totalAtualCentavos += item.valorAtualCentavos;
    porClasseMap.set(item.classe, atual);
  });

  return {
    items,
    resumo: {
      quantidade: items.length,
      totalInvestidoCentavos,
      totalAtualCentavos,
      rentabilidade: rentabilidadeDe(totalInvestidoCentavos, totalAtualCentavos),
      porClasse: [...porClasseMap.values()]
        .map((item) => ({ ...item, rentabilidade: rentabilidadeDe(item.totalInvestidoCentavos, item.totalAtualCentavos) }))
        .sort((a, b) => b.totalAtualCentavos - a.totalAtualCentavos)
    }
  };
}

export function buscarInvestimento(id) {
  const investimento = getInvestimentoById(id);
  if (!investimento) throw new AppError('Investimento nao encontrado.', 404);
  return investimento;
}

export function criarInvestimento(payload) {
  return createInvestimento(normalize(payload));
}

export function editarInvestimento(id, payload) {
  buscarInvestimento(id);
  return updateInvestimento(id, normalize(payload));
}

export function excluirInvestimento(id) {
  buscarInvestimento(id);
  deleteInvestimento(id);
}

function parseValorPlanilha(raw) {
  if (raw === undefined || raw === null || raw === '') return NaN;
  const value = String(raw).trim().replace(/[^0-9,.\-]/g, '');
  if (!value) return NaN;
  const hasComma = value.includes(',');
  const hasDot = value.includes('.');
  let normalized = value;
  if (hasComma && hasDot) {
    normalized = value.lastIndexOf(',') > value.lastIndexOf('.')
      ? value.replace(/\./g, '').replace(',', '.')
      : value.replace(/,/g, '');
  } else if (hasComma) {
    normalized = value.replace(',', '.');
  }
  const number = Number(normalized);
  if (Number.isNaN(number)) return NaN;
  return Math.round(number * 100);
}

export function importarInvestimentosCsv(buffer) {
  const linhas = parseCsv(buffer.toString('utf-8'));
  if (linhas.length === 0) {
    throw new AppError('Planilha vazia ou em formato invalido. Use um CSV com cabecalho.', 400);
  }

  const validos = [];
  const erros = [];

  linhas.forEach((linha, index) => {
    const numeroLinha = index + 2;
    const ativo = (linha.ativo || linha.nome || '').trim();
    const classe = (linha.classe || '').trim().toUpperCase().replace(/\s+/g, '_');
    const instituicao = (linha.instituicao || linha['instituição'] || '').trim() || null;
    const dataAplicacao = (linha.data_aplicacao || linha.dataaplicacao || linha.data || '').trim();
    const valorInvestido = parseValorPlanilha(linha.valor_investido || linha.valorinvestido);
    const valorAtual = parseValorPlanilha(linha.valor_atual || linha.valoratual);

    if (!ativo) { erros.push({ linha: numeroLinha, motivo: 'Coluna "ativo" ausente ou vazia.' }); return; }
    if (!CLASSES_VALIDAS.includes(classe)) { erros.push({ linha: numeroLinha, motivo: `Classe invalida: "${linha.classe || ''}". Use ${CLASSES_VALIDAS.join(', ')}.` }); return; }
    if (!isDateISO(dataAplicacao)) { erros.push({ linha: numeroLinha, motivo: 'Coluna "data_aplicacao" invalida (use AAAA-MM-DD).' }); return; }
    if (!Number.isInteger(valorInvestido) || valorInvestido < 0) { erros.push({ linha: numeroLinha, motivo: 'Coluna "valor_investido" invalida.' }); return; }
    if (!Number.isInteger(valorAtual) || valorAtual < 0) { erros.push({ linha: numeroLinha, motivo: 'Coluna "valor_atual" invalida.' }); return; }

    validos.push({
      ativo,
      classe,
      instituicao,
      valorInvestidoCentavos: valorInvestido,
      valorAtualCentavos: valorAtual,
      dataAplicacao,
      origem: 'IMPORTADO',
      observacoes: null
    });
  });

  const criados = validos.length > 0 ? createInvestimentosBulk(validos) : [];
  return { criados: criados.length, erros, itens: criados };
}
