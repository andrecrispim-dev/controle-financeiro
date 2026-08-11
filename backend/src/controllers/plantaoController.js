import { successResponse } from '../utils/apiResponse.js';
import {
  criarFeriado,
  criarPlantao,
  editarFeriado,
  editarPlantao,
  editarValorPlantao,
  excluirFeriado,
  excluirPlantao,
  lancarPlantoes,
  listarFeriados,
  listarPlantoes,
  listarValoresPlantao
} from '../services/plantaoService.js';
import {
  feriadoCreateSchema,
  feriadoUpdateSchema,
  excluirPlantaoSchema,
  lancarPlantoesSchema,
  plantaoCreateSchema,
  plantaoFiltersSchema,
  plantaoUpdateSchema,
  plantaoValorUpdateSchema
} from '../validators/plantaoValidator.js';

export function index(req, res) {
  const filters = plantaoFiltersSchema.parse(req.query);
  successResponse(res, { message: 'Plantoes listados com sucesso.', data: listarPlantoes(filters) });
}

export function store(req, res) {
  const data = plantaoCreateSchema.parse(req.body);
  successResponse(res, { status: 201, message: 'Plantao criado com sucesso.', data: criarPlantao(data) });
}

export function update(req, res) {
  const data = plantaoUpdateSchema.parse(req.body);
  successResponse(res, { message: 'Plantao atualizado com sucesso.', data: editarPlantao(Number(req.params.id), data) });
}

export function destroy(req, res) {
  const data = excluirPlantaoSchema.parse(req.body || {});
  excluirPlantao(Number(req.params.id), data || {});
  successResponse(res, { message: 'Plantao excluido com sucesso.' });
}

export function lancar(req, res) {
  const data = lancarPlantoesSchema.parse(req.body);
  successResponse(res, { message: 'Plantoes lancados no financeiro com sucesso.', data: lancarPlantoes(data) });
}

export function valores(req, res) {
  successResponse(res, { message: 'Valores de plantoes listados com sucesso.', data: listarValoresPlantao() });
}

export function updateValor(req, res) {
  const data = plantaoValorUpdateSchema.parse(req.body);
  successResponse(res, { message: 'Valor de plantao atualizado com sucesso.', data: editarValorPlantao(Number(req.params.id), data) });
}

export function feriados(req, res) {
  successResponse(res, { message: 'Feriados listados com sucesso.', data: listarFeriados() });
}

export function storeFeriado(req, res) {
  const data = feriadoCreateSchema.parse(req.body);
  successResponse(res, { status: 201, message: 'Feriado criado com sucesso.', data: criarFeriado(data) });
}

export function updateFeriadoItem(req, res) {
  const data = feriadoUpdateSchema.parse(req.body);
  successResponse(res, { message: 'Feriado atualizado com sucesso.', data: editarFeriado(Number(req.params.id), data) });
}

export function destroyFeriado(req, res) {
  excluirFeriado(Number(req.params.id));
  successResponse(res, { message: 'Feriado excluido com sucesso.' });
}
