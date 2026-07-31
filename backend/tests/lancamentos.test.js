import request from 'supertest';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { closeDb, getDb, migrate } from '../src/database/db.js';

beforeEach(() => {
  const db = getDb();
  db.exec('DROP TABLE IF EXISTS lancamentos; DROP TABLE IF EXISTS categorias;');
  migrate(db);
});

afterAll(() => closeDb());

async function criarBase(overrides = {}) {
  const res = await request(app).post('/api/lancamentos').send({
    tipo: 'PAGAR',
    descricao: 'Conta teste',
    categoria: 'Outros',
    valor: 100,
    dataVencimento: '2026-07-30',
    status: 'PENDENTE',
    ...overrides
  });
  return res.body.data[0];
}

describe('lancamentos', () => {
  it('cria um lancamento valido', async () => {
    const res = await request(app).post('/api/lancamentos').send({
      tipo: 'RECEBER',
      descricao: 'Cliente A',
      categoria: 'Clientes',
      valor: 250.75,
      dataVencimento: '2026-07-31',
      status: 'PENDENTE'
    });
    expect(res.status).toBe(201);
    expect(res.body.data[0].valorCentavos).toBe(25075);
  });

  it('valida valor maior que zero', async () => {
    const res = await request(app).post('/api/lancamentos').send({
      tipo: 'PAGAR',
      descricao: 'Invalido',
      valor: 0,
      dataVencimento: '2026-07-31'
    });
    expect(res.status).toBe(400);
  });

  it('edita, conclui, reabre e exclui', async () => {
    const item = await criarBase();
    const edit = await request(app).put(`/api/lancamentos/${item.id}`).send({
      tipo: 'PAGAR',
      descricao: 'Conta editada',
      categoria: 'Outros',
      valor: 150,
      dataVencimento: '2026-08-01',
      status: 'PENDENTE'
    });
    expect(edit.body.data.descricao).toBe('Conta editada');

    const done = await request(app).patch(`/api/lancamentos/${item.id}/concluir`).send({ dataPagamento: '2026-08-02' });
    expect(done.body.data.status).toBe('CONCLUIDO');

    const reopen = await request(app).patch(`/api/lancamentos/${item.id}/reabrir`).send();
    expect(reopen.body.data.dataPagamento).toBeNull();

    const del = await request(app).delete(`/api/lancamentos/${item.id}`);
    expect(del.status).toBe(200);
  });

  it('filtra e calcula dashboard e relatorios', async () => {
    await criarBase({ tipo: 'PAGAR', descricao: 'Energia', valor: 200, dataVencimento: '2026-07-10' });
    await criarBase({ tipo: 'RECEBER', descricao: 'Cliente', valor: 500, dataVencimento: '2026-07-11' });
    await criarBase({ tipo: 'RECEBER', descricao: 'Salario futuro', valor: 5000, dataVencimento: '2026-08-05' });
    await criarBase({ tipo: 'PAGAR', descricao: 'Parcela futura paga hoje', valor: 1000, dataVencimento: '2026-08-10', dataPagamento: '2026-07-30', status: 'CONCLUIDO' });
    const list = await request(app).get('/api/lancamentos?tipo=RECEBER&dataInicial=2026-07-01&dataFinal=2026-07-31');
    expect(list.body.meta.total).toBe(1);

    const dash = await request(app).get('/api/dashboard/resumo');
    expect(dash.body.data.saldoProjetado).toBe(30000);
    expect(dash.body.data.totalPago).toBe(0);
    expect(dash.body.data.periodo).toEqual({ dataInicial: '2026-07-01', dataFinal: '2026-07-31' });

    const report = await request(app).get('/api/relatorios/resumo?dataInicial=2026-07-01&dataFinal=2026-07-31');
    expect(report.body.data.saldoPrevisto).toBe(30000);

    const futureReport = await request(app).get('/api/relatorios/resumo?dataInicial=2026-08-01&dataFinal=2026-08-31');
    expect(futureReport.body.data.previstoReceber).toBe(500000);
  });
});
