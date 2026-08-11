import { successResponse } from '../utils/apiResponse.js';
import { aporteSchema, metaSchema } from '../validators/metaValidator.js';
import {
  buscarMeta,
  criarMeta,
  editarMeta,
  excluirMeta,
  listarAportes,
  listarMetas,
  registrarAporte
} from '../services/metaService.js';

export function index(req, res) {
  successResponse(res, { message: 'Metas listadas com sucesso.', data: listarMetas() });
}

export function show(req, res) {
  successResponse(res, { message: 'Meta carregada com sucesso.', data: buscarMeta(Number(req.params.id)) });
}

export function store(req, res) {
  const data = metaSchema.parse(req.body);
  successResponse(res, { status: 201, message: 'Meta criada com sucesso.', data: criarMeta(data) });
}

export function update(req, res) {
  const data = metaSchema.parse(req.body);
  successResponse(res, { message: 'Meta atualizada com sucesso.', data: editarMeta(Number(req.params.id), data) });
}

export function destroy(req, res) {
  excluirMeta(Number(req.params.id));
  successResponse(res, { message: 'Meta excluida com sucesso.' });
}

export function indexAportes(req, res) {
  successResponse(res, { message: 'Aportes listados com sucesso.', data: listarAportes(Number(req.params.id)) });
}

export function storeAporte(req, res) {
  const data = aporteSchema.parse(req.body);
  successResponse(res, { status: 201, message: 'Aporte registrado com sucesso.', data: registrarAporte(Number(req.params.id), data) });
}
