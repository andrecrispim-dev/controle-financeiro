import { filtrosLancamentosSchema } from '../validators/lancamentoValidator.js';
import { listarTodosParaExportacao } from '../services/lancamentoService.js';

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function csv(req, res) {
  const filters = filtrosLancamentosSchema.parse({ ...req.query, limite: 100 });
  const items = listarTodosParaExportacao(filters);
  const header = ['Tipo', 'Descricao', 'Categoria', 'Valor', 'Data de vencimento', 'Data de pagamento', 'Status', 'Observacoes'];
  const rows = items.map((item) => [
    item.tipo, item.descricao, item.categoria, item.valor.toFixed(2), item.dataVencimento,
    item.dataPagamento, item.status, item.observacoes
  ]);
  const content = [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="lancamentos.csv"');
  res.send(`\uFEFF${content}`);
}
