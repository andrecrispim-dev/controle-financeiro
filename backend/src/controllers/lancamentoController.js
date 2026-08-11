import { successResponse } from '../utils/apiResponse.js';
import {
  cancelarLancamento,
  concluirLancamento,
  criarLancamento,
  editarLancamento,
  excluirLancamento,
  buscarLancamento,
  listarLancamentos,
  reabrirLancamento
} from '../services/lancamentoService.js';
import { concluirSchema, excluirLancamentoSchema, filtrosLancamentosSchema, lancamentoCreateSchema, lancamentoUpdateSchema } from '../validators/lancamentoValidator.js';

export function index(req, res) {
  const filters = filtrosLancamentosSchema.parse(req.query);
  const result = listarLancamentos(filters);
  successResponse(res, {
    message: 'Lancamentos listados com sucesso.',
    data: result.items,
    meta: { total: result.total, pagina: filters.pagina, limite: filters.limite }
  });
}

export function show(req, res) {
  successResponse(res, { message: 'Lancamento encontrado.', data: buscarLancamento(Number(req.params.id)) });
}

export function store(req, res) {
  const data = lancamentoCreateSchema.parse(req.body);
  const created = criarLancamento(data);
  successResponse(res, { status: 201, message: 'Lancamento criado com sucesso.', data: created });
}

export function update(req, res) {
  const data = lancamentoUpdateSchema.parse(req.body);
  successResponse(res, { message: 'Lancamento atualizado com sucesso.', data: editarLancamento(Number(req.params.id), data) });
}

export function destroy(req, res) {
  const data = excluirLancamentoSchema.parse(req.body || {});
  excluirLancamento(Number(req.params.id), data?.escopo);
  successResponse(res, { message: 'Lancamento excluido com sucesso.' });
}

export function concluir(req, res) {
  const data = concluirSchema.parse(req.body || {});
  successResponse(res, { message: 'Lancamento concluido com sucesso.', data: concluirLancamento(Number(req.params.id), data) });
}

export function reabrir(req, res) {
  successResponse(res, { message: 'Lancamento reaberto com sucesso.', data: reabrirLancamento(Number(req.params.id)) });
}

export function cancelar(req, res) {
  successResponse(res, { message: 'Lancamento cancelado com sucesso.', data: cancelarLancamento(Number(req.params.id)) });
}
