import { dashboardResumo, proximosVencimentos } from '../repositories/lancamentoRepository.js';
import { successResponse } from '../utils/apiResponse.js';

export function resumo(req, res) {
  successResponse(res, { message: 'Resumo carregado com sucesso.', data: dashboardResumo() });
}

export function proximos(req, res) {
  successResponse(res, { message: 'Proximos vencimentos carregados com sucesso.', data: proximosVencimentos(Number(req.query.limite || 8)) });
}
