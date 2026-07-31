import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Lancamentos } from '../pages/Lancamentos.jsx';

global.fetch = vi.fn((url) => {
  const body = url.includes('/categorias')
    ? { success: true, data: [] }
    : { success: true, data: [{ id: 1, tipo: 'PAGAR', descricao: 'Energia', categoria: 'Energia', valorCentavos: 10000, dataVencimento: '2026-07-30', status: 'PENDENTE' }], meta: { total: 1, pagina: 1, limite: 10 } };
  return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) });
});

describe('Lancamentos', () => {
  it('renderiza listagem alimentada pela API', async () => {
    render(<MemoryRouter><Lancamentos /></MemoryRouter>);
    expect(await screen.findAllByText('Energia')).toHaveLength(2);
    expect(screen.getByText(/R\$\s*100,00/)).toBeInTheDocument();
  });
});
