export const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatMoneyFromCentavos(value) {
  return moeda.format((value || 0) / 100);
}

export function formatDate(dateISO) {
  if (!dateISO) return '-';
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
}

export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function monthRangeISO(dateISO = todayISO()) {
  const [year, month] = dateISO.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function queryString(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}
