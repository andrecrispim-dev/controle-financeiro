import { porCategoria, porMes, relatorioPeriodo } from '../repositories/lancamentoRepository.js';
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
