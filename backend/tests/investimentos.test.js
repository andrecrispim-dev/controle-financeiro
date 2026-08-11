import request from 'supertest';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { closeDb, getDb, migrate } from '../src/database/db.js';

beforeEach(() => {
  const db = getDb();
  db.exec('DROP TABLE IF EXISTS investimentos;');
  migrate(db);
});

afterAll(() => closeDb());

describe('investimentos', () => {
  it('cadastra manualmente e calcula totais/rentabilidade por classe', async () => {
    await request(app).post('/api/investimentos').send({
      ativo: 'Tesouro Selic',
      classe: 'RENDA_FIXA',
      instituicao: 'Tesouro Direto',
      valorInvestido: 1000,
      valorAtual: 1100,
      dataAplicacao: '2026-01-10'
    });
    await request(app).post('/api/investimentos').send({
      ativo: 'ITSA4',
      classe: 'RENDA_VARIAVEL',
      instituicao: 'XP',
      valorInvestido: 500,
      valorAtual: 450,
      dataAplicacao: '2026-02-05'
    });

    const listagem = await request(app).get('/api/investimentos');
    expect(listagem.status).toBe(200);
    expect(listagem.body.data.items).toHaveLength(2);
    expect(listagem.body.data.resumo.totalInvestidoCentavos).toBe(150000);
    expect(listagem.body.data.resumo.totalAtualCentavos).toBe(155000);
    expect(listagem.body.data.resumo.porClasse).toHaveLength(2);
  });

  it('importa investimentos via CSV, ignorando linhas invalidas', async () => {
    const csv = [
      'ativo;classe;instituicao;valor_investido;valor_atual;data_aplicacao',
      'CDB Banco X;RENDA_FIXA;Banco X;1000.00;1050.00;2026-03-01',
      'Fundo Imobiliario;IMOVEL;Corretora Y;2000,50;2100,00;2026-03-15',
      'Linha invalida;CLASSE_INEXISTENTE;;100;100;2026-03-01'
    ].join('\n');

    const response = await request(app)
      .post('/api/investimentos/importar')
      .attach('arquivo', Buffer.from(csv, 'utf-8'), 'investimentos.csv');

    expect(response.status).toBe(201);
    expect(response.body.data.criados).toBe(2);
    expect(response.body.data.erros).toHaveLength(1);
    expect(response.body.data.erros[0].motivo).toMatch(/Classe invalida/);

    const listagem = await request(app).get('/api/investimentos');
    expect(listagem.body.data.items).toHaveLength(2);
    expect(listagem.body.data.items.every((item) => item.origem === 'IMPORTADO')).toBe(true);
    const imovel = listagem.body.data.items.find((item) => item.classe === 'IMOVEL');
    expect(imovel.valorInvestidoCentavos).toBe(200050);
    expect(imovel.valorAtualCentavos).toBe(210000);
  });
});
