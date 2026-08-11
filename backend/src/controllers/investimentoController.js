import { successResponse } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { investimentoSchema } from '../validators/investimentoValidator.js';
import {
  buscarInvestimento,
  criarInvestimento,
  editarInvestimento,
  excluirInvestimento,
  importarInvestimentosCsv,
  listarInvestimentos
} from '../services/investimentoService.js';

export function index(req, res) {
  successResponse(res, { message: 'Investimentos listados com sucesso.', data: listarInvestimentos() });
}

export function show(req, res) {
  successResponse(res, { message: 'Investimento carregado com sucesso.', data: buscarInvestimento(Number(req.params.id)) });
}

export function store(req, res) {
  const data = investimentoSchema.parse(req.body);
  successResponse(res, { status: 201, message: 'Investimento cadastrado com sucesso.', data: criarInvestimento(data) });
}

export function update(req, res) {
  const data = investimentoSchema.parse(req.body);
  successResponse(res, { message: 'Investimento atualizado com sucesso.', data: editarInvestimento(Number(req.params.id), data) });
}

export function destroy(req, res) {
  excluirInvestimento(Number(req.params.id));
  successResponse(res, { message: 'Investimento excluido com sucesso.' });
}

export function importar(req, res) {
  if (!req.file) throw new AppError('Envie um arquivo CSV.', 400);
  const resultado = importarInvestimentosCsv(req.file.buffer);
  successResponse(res, { status: 201, message: `${resultado.criados} investimento(s) importado(s) com sucesso.`, data: resultado });
}
