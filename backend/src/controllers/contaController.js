import { successResponse } from '../utils/apiResponse.js';
import { contaSchema } from '../validators/contaValidator.js';
import { criarConta, editarConta, excluirConta, listarContas } from '../services/contaService.js';

export function index(req, res) {
  successResponse(res, {
    message: 'Contas listadas com sucesso.',
    data: listarContas({ somenteAtivas: req.query.ativas === 'true' })
  });
}

export function store(req, res) {
  const data = contaSchema.parse(req.body);
  successResponse(res, { status: 201, message: 'Conta criada com sucesso.', data: criarConta(data) });
}

export function update(req, res) {
  const data = contaSchema.parse(req.body);
  successResponse(res, { message: 'Conta atualizada com sucesso.', data: editarConta(Number(req.params.id), data) });
}

export function destroy(req, res) {
  excluirConta(Number(req.params.id));
  successResponse(res, { message: 'Conta excluida com sucesso.' });
}
