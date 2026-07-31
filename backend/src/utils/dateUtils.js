export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function addDaysISO(dateISO, days) {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonthsISO(dateISO, months) {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function monthRangeISO(dateISO = todayISO()) {
  const [year, month] = dateISO.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(Date.UTC(year, month, 0));
  return {
    start,
    end: endDate.toISOString().slice(0, 10)
  };
}

export function isDateISO(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}
