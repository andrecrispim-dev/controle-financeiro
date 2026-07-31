export function successResponse(res, { status = 200, message = 'Operacao realizada com sucesso.', data = null, meta = null }) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(status).json(body);
}
