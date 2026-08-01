import { dashboardResumo, proximosVencimentos } from '../repositories/lancamentoRepository.js';
import { successResponse } from '../utils/apiResponse.js';
import { monthRangeISO } from '../utils/dateUtils.js';

function parsePeriodo(query) {
  const month = monthRangeISO();
  return {
    dataInicial: query.dataInicial || month.start,
    dataFinal: query.dataFinal || month.end
  };
}

export function resumo(req, res) {
  successResponse(res, { message: 'Resumo carregado com sucesso.', data: dashboardResumo(parsePeriodo(req.query)) });
}

export function proximos(req, res) {
  const periodo = parsePeriodo(req.query);
  successResponse(res, { message: 'Proximos vencimentos carregados com sucesso.', data: proximosVencimentos(Number(req.query.limite || 8), periodo) });
}
