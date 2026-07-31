import { z } from 'zod';

export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'O nome e obrigatorio.').max(80, 'O nome deve ter no maximo 80 caracteres.'),
  tipo: z.enum(['PAGAR', 'RECEBER', 'AMBOS'], { required_error: 'O tipo e obrigatorio.' })
});
