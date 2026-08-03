import { filtrosLancamentosSchema } from '../validators/lancamentoValidator.js';
import { listarTodosParaExportacao } from '../services/lancamentoService.js';
import { relatorioLancamentos } from '../repositories/lancamentoRepository.js';
import { createTextPdf } from '../utils/pdf.js';

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function csv(req, res) {
  const filters = filtrosLancamentosSchema.parse({ ...req.query, limite: 100 });
  const items = listarTodosParaExportacao(filters);
  const header = ['Tipo', 'Descricao', 'Categoria', 'Conta bancaria', 'Valor', 'Data de vencimento', 'Data de pagamento', 'Status', 'Observacoes'];
  const rows = items.map((item) => [
    item.tipo, item.descricao, item.categoria, item.contaNome, item.valor.toFixed(2), item.dataVencimento,
    item.dataPagamento, item.status, item.observacoes
  ]);
  const content = [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="lancamentos.csv"');
  res.send(`\uFEFF${content}`);
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);
}

function labelTipo(tipo) {
  if (tipo === 'PAGAR') return 'Contas a pagar';
  if (tipo === 'RECEBER') return 'Contas a receber';
  return 'Consolidado';
}

export function pdf(req, res) {
  const filters = filtrosLancamentosSchema.parse({ ...req.query, limite: 100 });
  const { items, totais } = relatorioLancamentos(filters);
  const lines = [
    'Controle Financeiro - Relatorio de Lancamentos',
    `Tipo: ${labelTipo(filters.tipo)}`,
    `Periodo: ${filters.dataInicial || '-'} a ${filters.dataFinal || '-'}`,
    `Status: ${filters.status || 'Todos'} | Categoria: ${filters.categoria || 'Todas'} | Descricao: ${filters.descricao || 'Todas'}`,
    '',
    `Quantidade: ${totais.quantidade}`,
    `Total a receber: ${money(totais.totalReceber)} | Total a pagar: ${money(totais.totalPagar)} | Saldo geral: ${money(totais.saldoGeral)}`,
    `Recebido: ${money(totais.recebido)} | Pago: ${money(totais.pago)} | Saldo realizado: ${money(totais.saldoRealizado)}`,
    `Receber pendente: ${money(totais.receberPendente)} | Pagar pendente: ${money(totais.pagarPendente)} | Saldo previsto: ${money(totais.saldoPrevisto)}`,
    '',
    'Lancamentos',
    'Tipo | Vencimento | Status | Descricao | Categoria | Conta | Valor'
  ];

  items.forEach((item) => {
    lines.push([
      item.tipo,
      item.dataVencimento,
      item.status,
      item.descricao,
      item.categoria || '-',
      item.contaNome || '-',
      money(item.valorCentavos)
    ].join(' | '));
  });

  const buffer = createTextPdf(lines);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="relatorio-lancamentos.pdf"');
  res.send(buffer);
}
