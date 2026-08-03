import { porCategoria, porMes, relatorioLancamentos, relatorioPeriodo, relatoriosEspecificos } from '../repositories/lancamentoRepository.js';
import { successResponse } from '../utils/apiResponse.js';
import { monthRangeISO } from '../utils/dateUtils.js';
import { filtrosLancamentosSchema } from '../validators/lancamentoValidator.js';

function parseFilters(query) {
  const month = monthRangeISO();
  return filtrosLancamentosSchema.parse({
    dataInicial: month.start,
    dataFinal: month.end,
    limite: 100,
    ...query
  });
}

export function resumo(req, res) {
  successResponse(res, { message: 'Relatorio carregado com sucesso.', data: relatorioPeriodo(parseFilters(req.query)) });
}

export function categoria(req, res) {
  successResponse(res, { message: 'Relatorio por categoria carregado com sucesso.', data: porCategoria(parseFilters(req.query)) });
}

export function mes(req, res) {
  successResponse(res, { message: 'Relatorio por mes carregado com sucesso.', data: porMes(parseFilters(req.query)) });
}

export function especificos(req, res) {
  successResponse(res, { message: 'Relatorios especificos carregados com sucesso.', data: relatoriosEspecificos(parseFilters(req.query)) });
}

export function lancamentos(req, res) {
  successResponse(res, { message: 'Relatorio de lancamentos carregado com sucesso.', data: relatorioLancamentos(parseFilters(req.query)) });
}
