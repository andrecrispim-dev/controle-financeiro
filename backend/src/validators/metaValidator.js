import { z } from 'zod';
import { isDateISO } from '../utils/dateUtils.js';
import { toCentavos } from '../utils/money.js';

const dateField = z.string().refine(isDateISO, 'Informe uma data valida no formato YYYY-MM-DD.');
const money = z.union([z.string(), z.number()]).transform(toCentavos).refine((value) => Number.isInteger(value) && value > 0, 'O valor deve ser maior que zero.');

export const metaSchema = z.object({
  nome: z.string().trim().min(1, 'O nome e obrigatorio.').max(120, 'O nome deve ter no maximo 120 caracteres.'),
  valorAlvo: money,
  valorAtual: z.union([z.string(), z.number()]).optional().transform((value) => {
    if (value === undefined || value === '') return 0;
    return toCentavos(value);
  }),
  dataAlvo: dateField.optional().nullable().or(z.literal('')),
  cor: z.string().trim().max(20).optional().nullable(),
  contaId: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']).optional().default('EM_ANDAMENTO'),
  observacoes: z.string().trim().max(500).optional().nullable()
});

export const aporteSchema = z.object({
  data: dateField,
  valor: money,
  observacoes: z.string().trim().max(500).optional().nullable()
});
