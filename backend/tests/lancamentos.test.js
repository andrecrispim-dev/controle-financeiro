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

    const dash = await request(app).get('/api/dashboard/resumo?dataInicial=2026-07-01&dataFinal=2026-07-31');
    expect(dash.body.data.saldoProjetado).toBe(30000);
    expect(dash.body.data.totalPago).toBe(0);
    expect(dash.body.data.periodo).toEqual({ dataInicial: '2026-07-01', dataFinal: '2026-07-31' });

    const futureDash = await request(app).get('/api/dashboard/resumo?dataInicial=2026-08-01&dataFinal=2026-08-31');
    expect(futureDash.body.data.totalReceberPendente).toBe(500000);

    const report = await request(app).get('/api/relatorios/resumo?dataInicial=2026-07-01&dataFinal=2026-07-31');
    expect(report.body.data.saldoPrevisto).toBe(30000);

    const futureReport = await request(app).get('/api/relatorios/resumo?dataInicial=2026-08-01&dataFinal=2026-08-31');
    expect(futureReport.body.data.previstoReceber).toBe(500000);
  });

  it('gera relatorios especificos mensais, por categoria e recorrencias futuras', async () => {
    await criarBase({ tipo: 'RECEBER', descricao: 'Salario', categoria: 'Salario', valor: 1000, dataVencimento: '2026-08-05', status: 'PENDENTE' });
    await criarBase({ tipo: 'PAGAR', descricao: 'Aluguel', categoria: 'Moradia', valor: 300, dataVencimento: '2026-08-10', status: 'PENDENTE' });
    await criarBase({ tipo: 'RECEBER', descricao: 'Cliente recebido', categoria: 'Clientes', valor: 700, dataVencimento: '2026-08-12', dataPagamento: '2026-08-13', status: 'CONCLUIDO' });
    await request(app).post('/api/lancamentos').send({
      tipo: 'PAGAR',
      descricao: 'Internet recorrente',
      categoria: 'Internet',
      valor: 100,
      dataVencimento: '2026-08-20',
      status: 'PENDENTE',
      recorrencia: { frequencia: 'MENSAL', quantidade: 3 }
    });

    const res = await request(app).get('/api/relatorios/especificos?dataInicial=2026-08-01&dataFinal=2026-12-31');

    expect(res.status).toBe(200);
    const agosto = res.body.data.mensal.find((item) => item.mes === '2026-08');
    expect(agosto.receberPrevisto).toBe(100000);
    expect(agosto.pagarPrevisto).toBe(40000);
    expect(agosto.receberRealizado).toBe(70000);
    expect(res.body.data.categorias.some((item) => item.categoria === 'Salario')).toBe(true);
    expect(res.body.data.recorrenciasFuturas[0].descricao).toBe('Internet recorrente');
  });

  it('exporta relatorio filtrado em PDF', async () => {
    await criarBase({ tipo: 'PAGAR', descricao: 'Boleto PDF', valor: 180, dataVencimento: '2026-08-18' });

    const res = await request(app).get('/api/exportacoes/pdf?tipo=PAGAR&dataInicial=2026-08-01&dataFinal=2026-08-31');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(Buffer.from(res.body).toString('latin1').startsWith('%PDF')).toBe(true);
  });
});
