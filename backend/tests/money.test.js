import { describe, expect, it } from 'vitest';
import { fromCentavos, toCentavos } from '../src/utils/money.js';

describe('toCentavos', () => {
  it('converte string decimal com ponto (input type=number nativo)', () => {
    expect(toCentavos('693.47')).toBe(69347);
    expect(toCentavos('693.5')).toBe(69350);
    expect(toCentavos('0.01')).toBe(1);
  });

  it('converte string decimal com virgula (formato pt-BR)', () => {
    expect(toCentavos('693,47')).toBe(69347);
    expect(toCentavos('1.234,56')).toBe(123456);
  });

  it('converte string inteira sem separador decimal', () => {
    expect(toCentavos('1712')).toBe(171200);
    expect(toCentavos('0')).toBe(0);
  });

  it('trata ponto de milhar sem casas decimais como parte do inteiro', () => {
    expect(toCentavos('1.234')).toBe(123400);
  });

  it('converte numeros JS diretamente', () => {
    expect(toCentavos(1000)).toBe(100000);
    expect(toCentavos(693.47)).toBe(69347);
  });
});

describe('fromCentavos', () => {
  it('converte centavos de volta para reais', () => {
    expect(fromCentavos(69347)).toBe(693.47);
    expect(fromCentavos(0)).toBe(0);
    expect(fromCentavos(undefined)).toBe(0);
  });
});
