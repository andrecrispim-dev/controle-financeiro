import { categoriaSchema } from '../validators/categoriaValidator.js';
import { criarCategoria, editarCategoria, excluirCategoria, listarCategorias } from '../services/categoriaService.js';
import { successResponse } from '../utils/apiResponse.js';

export function index(req, res) {
  successResponse(res, { message: 'Categorias listadas com sucesso.', data: listarCategorias() });
}

export function store(req, res) {
  const data = categoriaSchema.parse(req.body);
  successResponse(res, { status: 201, message: 'Categoria criada com sucesso.', data: criarCategoria(data) });
}

export function update(req, res) {
  const data = categoriaSchema.parse(req.body);
  successResponse(res, { message: 'Categoria atualizada com sucesso.', data: editarCategoria(Number(req.params.id), data) });
}

export function destroy(req, res) {
  excluirCategoria(Number(req.params.id));
  successResponse(res, { message: 'Categoria excluida com sucesso.' });
}
