import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(new AppError('Rota nao encontrada.', 404));
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Dados invalidos.',
      errors: err.errors.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  if (statusCode >= 500) {
    console.error('[erro]', err.message, err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Erro interno do servidor.',
    errors: err.errors || []
  });
}
