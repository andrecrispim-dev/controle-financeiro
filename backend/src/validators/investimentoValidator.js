import { z } from 'zod';
import { isDateISO } from '../utils/dateUtils.js';
import { toCentavos } from '../utils/money.js';

const money = z.union([z.string(), z.number()]).transform(toCentavos).refine((value) => Number.isInteger(value) && value >= 0, 'O valor deve ser maior ou igual a zero.');

export const investimentoSchema = z.object({
  ativo: z.string().trim().min(1, 'O ativo e obrigatorio.').max(120, 'O ativo deve ter no maximo 120 caracteres.'),
  classe: z.enum(['RENDA_FIXA', 'RENDA_VARIAVEL', 'FUNDO', 'IMOVEL', 'EXTERIOR', 'OUTRO'], { required_error: 'A classe e obrigatoria.' }),
  instituicao: z.string().trim().max(120).optional().nullable(),
  valorInvestido: money,
  valorAtual: money,
  dataAplicacao: z.string().refine(isDateISO, 'Informe uma data valida no formato YYYY-MM-DD.'),
  observacoes: z.string().trim().max(500).optional().nullable()
});
