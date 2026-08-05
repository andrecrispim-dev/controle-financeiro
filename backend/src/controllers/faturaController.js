import { analisarFatura, atualizarCategoriaItem, buscarFatura, confirmarFatura, excluirFatura, listarFaturas, listarItensFatura, relatorioGastosPorCategoria } from '../services/faturaService.js';
import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { faturaConfirmSchema, faturaItemCategoriaSchema, faturaItensFiltersSchema } from '../validators/faturaValidator.js';

export async function analisar(req, res) {
  if (!req.file) throw new AppError('Envie um PDF da fatura.', 400);
  if (req.file.mimetype !== 'application/pdf') throw new AppError('O arquivo precisa ser um PDF.', 400);
  const data = await analisarFatura(req.file);
  successResponse(res, { message: 'Fatura analisada com sucesso.', data });
}

export function confirmar(req, res) {
  const data = faturaConfirmSchema.parse(req.body);
  const result = confirmarFatura(data);
  successResponse(res, { status: 201, message: 'Fatura importada como lancamento a pagar.', data: result });
}

export function listar(req, res) {
  successResponse(res, { message: 'Faturas carregadas com sucesso.', data: listarFaturas() });
}

export function buscar(req, res) {
  successResponse(res, { message: 'Fatura carregada com sucesso.', data: buscarFatura(Number(req.params.id)) });
}

export function remover(req, res) {
  excluirFatura(Number(req.params.id));
  successResponse(res, { message: 'Fatura excluida com sucesso.' });
}

export function itens(req, res) {
  const filters = faturaItensFiltersSchema.parse(req.query);
  successResponse(res, { message: 'Itens de fatura carregados com sucesso.', data: listarItensFatura(filters) });
}

export function atualizarCategoria(req, res) {
  const payload = faturaItemCategoriaSchema.parse(req.body);
  const item = atualizarCategoriaItem(Number(req.params.id), payload.categoriaId || null);
  successResponse(res, { message: 'Categoria do item atualizada com sucesso.', data: item });
}

export function gastosCategoria(req, res) {
  const filters = faturaItensFiltersSchema.parse(req.query);
  successResponse(res, { message: 'Gastos por categoria carregados com sucesso.', data: relatorioGastosPorCategoria(filters) });
}
