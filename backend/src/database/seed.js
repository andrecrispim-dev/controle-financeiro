import { getDb } from './db.js';
import { criarLancamento } from '../services/lancamentoService.js';
import { addDaysISO, todayISO } from '../utils/dateUtils.js';

const db = getDb();
const alreadySeeded = db.prepare("SELECT COUNT(*) total FROM lancamentos WHERE observacoes = 'seed-demo'").get().total > 0;

if (alreadySeeded) {
  console.log('Seed ja executado. Nenhum dado duplicado foi criado.');
  process.exit(0);
}

const hoje = todayISO();
const registros = [
  { tipo: 'PAGAR', descricao: 'Conta de energia', categoria: 'Energia', valor: 24580, dataVencimento: addDaysISO(hoje, -3), status: 'PENDENTE', observacoes: 'seed-demo' },
  { tipo: 'PAGAR', descricao: 'Internet', categoria: 'Internet', valor: 11990, dataVencimento: addDaysISO(hoje, 2), status: 'PENDENTE', observacoes: 'seed-demo' },
  { tipo: 'PAGAR', descricao: 'Aluguel', categoria: 'Moradia', valor: 180000, dataVencimento: addDaysISO(hoje, 7), status: 'PENDENTE', observacoes: 'seed-demo' },
  { tipo: 'RECEBER', descricao: 'Pagamento de cliente', categoria: 'Clientes', valor: 320000, dataVencimento: addDaysISO(hoje, 4), status: 'PENDENTE', observacoes: 'seed-demo' },
  { tipo: 'RECEBER', descricao: 'Salario', categoria: 'Salario', valor: 650000, dataVencimento: addDaysISO(hoje, -10), dataPagamento: addDaysISO(hoje, -10), status: 'CONCLUIDO', observacoes: 'seed-demo' },
  { tipo: 'PAGAR', descricao: 'Assinatura de software', categoria: 'Outros', valor: 8990, dataVencimento: addDaysISO(hoje, -1), dataPagamento: addDaysISO(hoje, -1), status: 'CONCLUIDO', observacoes: 'seed-demo' }
];

registros.forEach((item) => criarLancamento(item));
console.log('Seed executado com sucesso.');
