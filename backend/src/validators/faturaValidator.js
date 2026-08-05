import { z } from 'zod';
import { isDateISO } from '../utils/dateUtils.js';

const optionalId = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.coerce.number().int().positive().nullable().optional()
);

export const faturaConfirmSchema = z.object({
  descricao: z.string().trim().min(1, 'A descricao e obrigatoria.').max(120),
  categoriaId: optionalId,
  contaId: z.coerce.number().int().positive('Selecione uma conta bancaria.'),
  valorCentavos: z.coerce.number().int().positive('O valor da fatura deve ser maior que zero.'),
  dataVencimento: z.string().refine(isDateISO, 'Data de vencimento invalida.'),
  banco: z.string().trim().max(80).optional().default('Bradesco'),
  arquivoNome: z.string().trim().max(180).optional().nullable(),
  observacoes: z.string().trim().max(1000).optional().nullable(),
  itens: z.array(z.object({
    data: z.string().trim().min(1).max(10),
    descricao: z.string().trim().min(1).max(160),
    cidade: z.string().trim().max(80).optional().nullable(),
    categoria: z.string().trim().max(80).optional().nullable(),
    categoriaId: optionalId,
    valorCentavos: z.coerce.number().int().positive(),
    tipo: z.enum(['A_VISTA', 'PARCELADO']),
    parcela: z.string().trim().max(12).optional().nullable(),
    cartaoTitular: z.string().trim().max(120).optional().nullable(),
    cartaoFinal: z.string().trim().max(20).optional().nullable(),
    ambiguo: z.boolean().optional().default(false),
    moeda: z.string().trim().max(80).optional().nullable()
  })).optional().default([])
});

export const faturaItemCategoriaSchema = z.object({
  categoriaId: optionalId
});

export const faturaItensFiltersSchema = z.object({
  faturaId: z.coerce.number().int().positive().optional(),
  dataInicial: z.string().optional().refine((value) => !value || isDateISO(value), 'Data inicial invalida.'),
  dataFinal: z.string().optional().refine((value) => !value || isDateISO(value), 'Data final invalida.'),
  categoria: z.string().trim().max(80).optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  descricao: z.string().trim().max(120).optional()
});
