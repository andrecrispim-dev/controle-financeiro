import { todayISO } from '../utils/formatters.js';

export function StatusBadge({ item }) {
  const hoje = todayISO();
  let label = item.status;
  let className = item.status.toLowerCase();
  if (item.status === 'PENDENTE' && item.dataVencimento < hoje) {
    label = 'VENCIDO';
    className = 'vencido';
  } else if (item.status === 'PENDENTE' && item.dataVencimento === hoje) {
    label = 'VENCE HOJE';
    className = 'hoje';
  }
  return <span className={`badge ${className}`}>{label}</span>;
}
