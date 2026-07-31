import { z } from 'zod';
import { isDateISO } from '../utils/dateUtils.js';
import { toCentavos } from '../utils/money.js';

const tipo = z.enum(['PAGAR', 'RECEBER'], { required_error: 'O tipo e obrigatorio.' });
const status = z.enum(['PENDENTE', 'CONCLUIDO', 'CANCELADO']).default('PENDENTE');
const dateField = z.string().refine(isDateISO, 'Informe uma data valida no formato YYYY-MM-DD.');

export const recorrenciaSchema = z.object({
  frequencia: z.enum(['NAO_REPETIR', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'ANUAL']).default('NAO_REPETIR'),
  quantidade: z.coerce.number().int().min(1).max(120).optional(),
  dataFinal: z.string().refine(isDateISO, 'Informe uma data final valida.').optional().or(z.literal(''))
}).optional();

export const lancamentoCreateSchema = z.object({
  tipo,
  descricao: z.string().trim().min(1, 'A descricao e obrigatoria.').max(120, 'A descricao deve ter no maximo 120 caracteres.'),
  categoriaId: z.coerce.number().int().positive().optional().nullable(),
  categoria: z.string().trim().max(80).optional().nullable(),
  valor: z.union([z.string(), z.number()]).transform(toCentavos).refine((value) => Number.isInteger(value) && value > 0, 'O valor deve ser maior que zero.'),
  dataVencimento: dateField,
  dataPagamento: z.string().refine(isDateISO, 'Informe uma data de pagamento valida.').optional().nullable().or(z.literal('')),
  status,
  observacoes: z.string().trim().max(1000).optional().nullable(),
  recorrencia: recorrenciaSchema
});

export const lancamentoUpdateSchema = lancamentoCreateSchema.extend({
  recorrencia: z.undefined().optional()
});

export const concluirSchema = z.object({
  dataPagamento: z.string().refine(isDateISO, 'Informe uma data valida no formato YYYY-MM-DD.').optional()
});

export const filtrosLancamentosSchema = z.object({
  tipo: z.enum(['PAGAR', 'RECEBER']).optional(),
  status: z.enum(['PENDENTE', 'CONCLUIDO', 'CANCELADO', 'VENCIDO']).optional(),
  categoria: z.string().trim().max(80).optional(),
  dataInicial: z.string().refine(isDateISO, 'Data inicial invalida.').optional(),
  dataFinal: z.string().refine(isDateISO, 'Data final invalida.').optional(),
  descricao: z.string().trim().max(120).optional(),
  valorMin: z.union([z.string(), z.number()]).optional().transform((value) => value === undefined || value === '' ? undefined : toCentavos(value)),
  valorMax: z.union([z.string(), z.number()]).optional().transform((value) => value === undefined || value === '' ? undefined : toCentavos(value)),
  ordenarPor: z.enum(['data_vencimento', 'valor', 'descricao']).default('data_vencimento'),
  ordem: z.enum(['asc', 'desc']).default('asc'),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(10)
});
