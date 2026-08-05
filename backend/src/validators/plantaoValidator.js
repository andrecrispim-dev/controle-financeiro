import { z } from 'zod';
import { isDateISO } from '../utils/dateUtils.js';
import { toCentavos } from '../utils/money.js';

const hospital = z.enum(['UNIMED', 'IPIS']);
const tipoPlantao = z.enum(['DIURNO', 'TARDE', 'NOTURNO', 'ESPECIAL']);
const contextoPlantao = z.enum(['SEMANA', 'FIM_SEMANA_FERIADO']);
const dateField = z.string().refine(isDateISO, 'Informe uma data valida no formato YYYY-MM-DD.');

export const plantaoFiltersSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, 'Informe o mes no formato YYYY-MM.').optional(),
  dataInicial: dateField.optional(),
  dataFinal: dateField.optional(),
  hospital: hospital.optional()
});

export const plantaoCreateSchema = z.object({
  data: dateField,
  hospital,
  tipo: tipoPlantao,
  quantidadeExtras: z.coerce.number().int().min(0).max(999).default(0),
  observacoes: z.string().trim().max(1000).optional().nullable(),
  confirmarAtualizacaoConcluido: z.boolean().optional()
});

export const plantaoUpdateSchema = plantaoCreateSchema;

export const lancarPlantoesSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, 'Informe o mes no formato YYYY-MM.'),
  hospital,
  categoriaId: z.coerce.number().int().positive().optional().nullable(),
  contaId: z.coerce.number().int().positive().optional().nullable(),
  dataVencimento: dateField,
  confirmarAtualizacaoConcluido: z.boolean().optional()
});

export const plantaoValorUpdateSchema = z.object({
  valorBase: z.union([z.string(), z.number()]).transform(toCentavos).refine((value) => value >= 0, 'Valor base invalido.'),
  valorExtra: z.union([z.string(), z.number()]).transform(toCentavos).refine((value) => value >= 0, 'Valor extra invalido.')
});

export const feriadoCreateSchema = z.object({
  data: dateField,
  nome: z.string().trim().min(1, 'O nome do feriado e obrigatorio.').max(120),
  tipo: z.enum(['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'PERSONALIZADO']).default('PERSONALIZADO')
});

export const feriadoUpdateSchema = feriadoCreateSchema;

export { contextoPlantao, hospital, tipoPlantao };
