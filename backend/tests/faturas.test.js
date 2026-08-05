import request from 'supertest';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { closeDb, getDb, migrate } from '../src/database/db.js';
import { splitDescParcela } from '../src/utils/faturaParser.js';

beforeEach(() => {
  const db = getDb();
  db.exec('DROP TABLE IF EXISTS fatura_itens; DROP TABLE IF EXISTS faturas_cartao; DROP TABLE IF EXISTS lancamentos; DROP TABLE IF EXISTS contas_bancarias; DROP TABLE IF EXISTS bancos; DROP TABLE IF EXISTS categorias;');
  migrate(db);
});

afterAll(() => closeDb());

describe('faturas', () => {
  it('separa parcela colada ao codigo do estabelecimento', () => {
    const result = splitDescParcela('LOJAS AMERICANAS 72707/10');

    expect(result).toEqual({
      desc: 'LOJAS AMERICANAS 7270',
      parcela: '07/10',
      ambiguous: false
    });
  });

  it('confirma fatura como lancamento unico a pagar e salva itens detalhados', async () => {
    const conta = await request(app).post('/api/contas').send({
      nome: 'Conta Cartao',
      saldoInicial: 0
    });
    const categoria = await request(app).post('/api/categorias').send({
      nome: 'Compras Online',
      tipo: 'PAGAR'
    });

    const res = await request(app).post('/api/faturas/confirmar').send({
      descricao: 'Fatura Bradesco 08/2026',
      contaId: conta.body.data.id,
      valorCentavos: 1657041,
      dataVencimento: '2026-08-08',
      observacoes: 'Teste de importacao.',
      itens: [
        {
          data: '07/01',
          descricao: 'Lojas Americanas 7270',
          cidade: 'SURUBIM',
          categoriaId: categoria.body.data.id,
          categoria: 'Compras Online',
          valorCentavos: 15000,
          tipo: 'PARCELADO',
          parcela: '07/10',
          cartaoTitular: 'Titular',
          cartaoFinal: '8177',
          ambiguo: false
        },
        {
          data: '09/01',
          descricao: 'Lojas Americanas 7270',
          cidade: 'SURUBIM',
          categoriaId: '',
          categoria: 'Sem categoria',
          valorCentavos: 30000,
          tipo: 'PARCELADO',
          parcela: '07/10',
          cartaoTitular: 'Titular',
          cartaoFinal: '8177',
          ambiguo: false
        }
      ]
    });

    expect(res.status).toBe(201);
    expect(res.body.data.lancamento.tipo).toBe('PAGAR');
    expect(res.body.data.lancamento.valorCentavos).toBe(1657041);
    expect(res.body.data.lancamento.contaId).toBe(conta.body.data.id);
    expect(res.body.data.fatura.quantidadeItens).toBe(2);

    const gastos = await request(app).get('/api/faturas/gastos-por-categoria');
    expect(gastos.status).toBe(200);
    expect(gastos.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ categoria: 'Sem categoria', totalCentavos: 30000 }),
      expect.objectContaining({ categoria: 'Compras Online', totalCentavos: 15000 })
    ]));

    const detalhe = await request(app).get(`/api/faturas/${res.body.data.fatura.id}`);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.data.itens).toHaveLength(2);

    const remove = await request(app).delete(`/api/faturas/${res.body.data.fatura.id}`);
    expect(remove.status).toBe(200);

    const list = await request(app).get('/api/faturas');
    expect(list.body.data).toHaveLength(0);
  });
});
