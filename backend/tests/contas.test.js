import request from 'supertest';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { closeDb, getDb, migrate } from '../src/database/db.js';

beforeEach(() => {
  const db = getDb();
  db.exec('DROP TABLE IF EXISTS lancamentos; DROP TABLE IF EXISTS contas_bancarias; DROP TABLE IF EXISTS bancos; DROP TABLE IF EXISTS categorias;');
  migrate(db);
});

afterAll(() => closeDb());

describe('contas bancarias', () => {
  it('calcula saldo com saldo inicial e lancamentos concluidos vinculados', async () => {
    const banco = await request(app).post('/api/bancos').send({
      nome: 'Banco Teste',
      codigo: '999'
    });

    const conta = await request(app).post('/api/contas').send({
      nome: 'Conta Principal',
      bancoId: banco.body.data.id,
      saldoInicial: 1000
    });

    expect(conta.status).toBe(201);
    expect(conta.body.data.banco).toBe('Banco Teste');
    const contaId = conta.body.data.id;

    await request(app).post('/api/lancamentos').send({
      tipo: 'RECEBER',
      descricao: 'Recebimento confirmado',
      valor: 500,
      dataVencimento: '2026-08-01',
      status: 'CONCLUIDO',
      dataPagamento: '2026-08-01',
      contaId
    });

    await request(app).post('/api/lancamentos').send({
      tipo: 'PAGAR',
      descricao: 'Pagamento pendente',
      valor: 200,
      dataVencimento: '2026-08-02',
      status: 'PENDENTE',
      contaId
    });

    await request(app).post('/api/lancamentos').send({
      tipo: 'PAGAR',
      descricao: 'Pagamento confirmado',
      valor: 150,
      dataVencimento: '2026-08-03',
      status: 'CONCLUIDO',
      dataPagamento: '2026-08-03',
      contaId
    });

    const contas = await request(app).get('/api/contas');
    expect(contas.body.data[0].saldoAtualCentavos).toBe(135000);

    const dashboard = await request(app).get('/api/dashboard/resumo?dataInicial=2026-08-01&dataFinal=2026-08-31');
    expect(dashboard.body.data.totalContas).toBe(135000);
  });
});
