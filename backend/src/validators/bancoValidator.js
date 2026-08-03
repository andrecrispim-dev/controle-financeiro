import { z } from 'zod';

export const bancoSchema = z.object({
  nome: z.string().trim().min(1, 'O nome e obrigatorio.').max(80, 'O nome deve ter no maximo 80 caracteres.'),
  codigo: z.string().trim().max(10).optional().nullable()
});
