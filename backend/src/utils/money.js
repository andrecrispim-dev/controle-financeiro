export function toCentavos(value) {
  if (typeof value === 'number') return Math.round(value * 100);
  if (typeof value !== 'string') return NaN;
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  return Math.round(Number(normalized) * 100);
}

export function fromCentavos(value) {
  return Number(value || 0) / 100;
}
