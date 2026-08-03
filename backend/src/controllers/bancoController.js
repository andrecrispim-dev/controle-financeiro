import { bancoSchema } from '../validators/bancoValidator.js';
import { criarBanco, editarBanco, excluirBanco, listarBancos } from '../services/bancoService.js';
import { successResponse } from '../utils/apiResponse.js';

export function index(req, res) {
  successResponse(res, { message: 'Bancos listados com sucesso.', data: listarBancos() });
}

export function store(req, res) {
  const data = bancoSchema.parse(req.body);
  successResponse(res, { status: 201, message: 'Banco criado com sucesso.', data: criarBanco(data) });
}

export function update(req, res) {
  const data = bancoSchema.parse(req.body);
  successResponse(res, { message: 'Banco atualizado com sucesso.', data: editarBanco(Number(req.params.id), data) });
}

export function destroy(req, res) {
  excluirBanco(Number(req.params.id));
  successResponse(res, { message: 'Banco excluido com sucesso.' });
}
