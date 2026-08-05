import request from 'supertest';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { closeDb, getDb, migrate } from '../src/database/db.js';

beforeEach(() => {
  const db = getDb();
  db.exec(`
    DROP TABLE IF EXISTS plantoes;
    DROP TABLE IF EXISTS plantao_lancamentos;
    DROP TABLE IF EXISTS plantao_valores;
    DROP TABLE IF EXISTS feriados;
    DROP TABLE IF EXISTS lancamentos;
    DROP TABLE IF EXISTS contas_bancarias;
    DROP TABLE IF EXISTS bancos;
    DROP TABLE IF EXISTS categorias;
  `);
  migrate(db);
});

afterAll(() => closeDb());

describe('plantoes', () => {
  it('calcula sexta noturna como fim de semana e sincroniza lancamento pendente do hospital/mes', async () => {
    const categoria = await request(app).post('/api/categorias').send({
      nome: 'Plantoes',
      tipo: 'RECEBER'
    });

    const created = await request(app).post('/api/plantoes').send({
      data: '2026-08-07',
      hospital: 'UNIMED',
      tipo: 'NOTURNO',
      quantidadeExtras: 2
    });

    expect(created.status).toBe(201);
    expect(created.body.data.usaValorFimSemana).toBe(true);
    expect(created.body.data.valorTotalCentavos).toBe(184600);

    const lancar = await request(app).post('/api/plantoes/lancar').send({
      mes: '2026-08',
      hospital: 'UNIMED',
      categoriaId: categoria.body.data.id,
      dataVencimento: '2026-08-31'
    });

    expect(lancar.status).toBe(200);
    expect(lancar.body.data.lancamentoStatus).toBe('PENDENTE');
    expect(lancar.body.data.lancamentoValorCentavos).toBe(184600);

    const updated = await request(app).put(`/api/plantoes/${created.body.data.id}`).send({
      data: '2026-08-07',
      hospital: 'UNIMED',
      tipo: 'NOTURNO',
      quantidadeExtras: 3
    });

    expect(updated.status).toBe(200);
    expect(updated.body.data.valorTotalCentavos).toBe(191300);

    const list = await request(app).get('/api/plantoes?mes=2026-08');
    const unimed = list.body.data.resumo.find((item) => item.hospital === 'UNIMED');
    expect(unimed.totalCentavos).toBe(191300);
    expect(unimed.lancamento.lancamentoValorCentavos).toBe(191300);
  });

  it('bloqueia dois plantoes do mesmo turno no mesmo dia', async () => {
    const first = await request(app).post('/api/plantoes').send({
      data: '2026-08-10',
      hospital: 'UNIMED',
      tipo: 'NOTURNO',
      quantidadeExtras: 0
    });

    expect(first.status).toBe(201);

    const duplicate = await request(app).post('/api/plantoes').send({
      data: '2026-08-10',
      hospital: 'IPIS',
      tipo: 'NOTURNO',
      quantidadeExtras: 0
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe('Ja existe um plantao deste turno cadastrado neste dia.');
  });
});
