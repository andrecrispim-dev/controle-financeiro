export function toCentavos(value) {
  if (typeof value === 'number') return Math.round(value * 100);
  if (typeof value !== 'string') return NaN;
  const trimmed = value.trim();

  let normalized;
  if (trimmed.includes(',')) {
    // Formato pt-BR: ponto e milhar, virgula e decimal (ex: "1.234,56").
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else {
    // Sem virgula: pode ser um <input type="number"> nativo, que sempre usa
    // ponto como separador decimal (ex: "693.47"), ou um valor pt-BR sem
    // casas decimais com ponto de milhar (ex: "1.234"). Um unico ponto com
    // 1 ou 2 digitos depois e tratado como decimal; qualquer outro caso
    // (multiplos pontos, ou 3+ digitos depois) e tratado como milhar.
    const dotCount = (trimmed.match(/\./g) || []).length;
    const lastDot = trimmed.lastIndexOf('.');
    const decimalDigits = lastDot === -1 ? 0 : trimmed.length - lastDot - 1;
    const looksLikeDecimal = dotCount === 1 && decimalDigits >= 1 && decimalDigits <= 2;
    normalized = looksLikeDecimal ? trimmed : trimmed.replace(/\./g, '');
  }

  return Math.round(Number(normalized) * 100);
}

export function fromCentavos(value) {
  return Number(value || 0) / 100;
}
