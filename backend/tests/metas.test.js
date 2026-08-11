import request from 'supertest';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { closeDb, getDb, migrate } from '../src/database/db.js';

beforeEach(() => {
  const db = getDb();
  db.exec('DROP TABLE IF EXISTS meta_aportes; DROP TABLE IF EXISTS metas; DROP TABLE IF EXISTS lancamentos; DROP TABLE IF EXISTS contas_bancarias; DROP TABLE IF EXISTS bancos; DROP TABLE IF EXISTS categorias;');
  migrate(db);
});

afterAll(() => closeDb());

describe('metas', () => {
  it('cria uma meta, registra aportes e calcula o progresso', async () => {
    const criada = await request(app).post('/api/metas').send({
      nome: 'Reserva de emergencia',
      valorAlvo: 10000,
      dataAlvo: '2026-12-31'
    });
    expect(criada.status).toBe(201);
    expect(criada.body.data.progresso).toBe(0);
    const metaId = criada.body.data.id;

    const aporte1 = await request(app).post(`/api/metas/${metaId}/aportes`).send({
      data: '2026-08-01',
      valor: 4000
    });
    expect(aporte1.status).toBe(201);
    expect(aporte1.body.data.valorAtualCentavos).toBe(400000);
    expect(aporte1.body.data.status).toBe('EM_ANDAMENTO');

    const aporte2 = await request(app).post(`/api/metas/${metaId}/aportes`).send({
      data: '2026-08-15',
      valor: 6000
    });
    expect(aporte2.status).toBe(201);
    expect(aporte2.body.data.valorAtualCentavos).toBe(1000000);
    expect(aporte2.body.data.status).toBe('CONCLUIDA');

    const aportes = await request(app).get(`/api/metas/${metaId}/aportes`);
    expect(aportes.body.data).toHaveLength(2);

    const meta = await request(app).get(`/api/metas/${metaId}`);
    expect(meta.body.data.progresso).toBe(1);
  });

  it('rejeita meta sem nome', async () => {
    const response = await request(app).post('/api/metas').send({ valorAlvo: 1000 });
    expect(response.status).toBe(400);
  });
});
