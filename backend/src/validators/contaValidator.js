import { z } from 'zod';
import { toCentavos } from '../utils/money.js';

export const contaSchema = z.object({
  nome: z.string().trim().min(1, 'O nome e obrigatorio.').max(80, 'O nome deve ter no maximo 80 caracteres.'),
  bancoId: z.coerce.number().int().positive('Selecione um banco valido.').optional().nullable(),
  banco: z.string().trim().max(80).optional().nullable(),
  agencia: z.string().trim().max(30).optional().nullable(),
  numero: z.string().trim().max(40).optional().nullable(),
  saldoInicial: z.union([z.string(), z.number()]).optional().transform((value) => {
    if (value === undefined || value === '') return 0;
    return toCentavos(value);
  }),
  ativa: z.boolean().optional().default(true),
  observacoes: z.string().trim().max(500).optional().nullable()
});
