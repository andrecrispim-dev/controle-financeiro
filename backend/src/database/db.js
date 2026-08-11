import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

let connection;

export function getDb() {
  if (!connection) {
    if (env.dbFile !== ':memory:') {
      fs.mkdirSync(path.dirname(env.dbFile), { recursive: true });
    }
    connection = new Database(env.dbFile);
    connection.pragma('foreign_keys = ON');
    connection.pragma('journal_mode = WAL');
    migrate(connection);
  }
  return connection;
}

export function closeDb() {
  if (connection) {
    connection.close();
    connection = null;
  }
}

export function migrate(db = getDb()) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL CHECK (tipo IN ('PAGAR', 'RECEBER', 'AMBOS')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bancos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      codigo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contas_bancarias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      banco_id INTEGER,
      banco TEXT,
      agencia TEXT,
      numero TEXT,
      saldo_inicial_centavos INTEGER NOT NULL DEFAULT 0,
      ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1)),
      observacoes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (banco_id) REFERENCES bancos(id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS lancamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK (tipo IN ('PAGAR', 'RECEBER')),
      descricao TEXT NOT NULL,
      categoria_id INTEGER,
      categoria TEXT,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      data_vencimento TEXT NOT NULL,
      data_pagamento TEXT,
      status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO')) DEFAULT 'PENDENTE',
      observacoes TEXT,
      recorrencia_grupo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS faturas_cartao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lancamento_id INTEGER NOT NULL UNIQUE,
      banco TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor_total_centavos INTEGER NOT NULL CHECK (valor_total_centavos > 0),
      data_vencimento TEXT NOT NULL,
      arquivo_nome TEXT,
      quantidade_itens INTEGER NOT NULL DEFAULT 0,
      soma_itens_centavos INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id) ON UPDATE CASCADE ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fatura_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fatura_id INTEGER NOT NULL,
      categoria_id INTEGER,
      categoria_importada TEXT,
      data_compra TEXT NOT NULL,
      data_original TEXT,
      descricao TEXT NOT NULL,
      cidade TEXT,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      tipo TEXT NOT NULL CHECK (tipo IN ('A_VISTA', 'PARCELADO')),
      parcela TEXT,
      cartao_titular TEXT,
      cartao_final TEXT,
      ambiguo INTEGER NOT NULL DEFAULT 0 CHECK (ambiguo IN (0, 1)),
      moeda TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (fatura_id) REFERENCES faturas_cartao(id) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS plantao_valores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK (tipo IN ('DIURNO', 'TARDE', 'NOTURNO', 'ESPECIAL')),
      contexto TEXT NOT NULL CHECK (contexto IN ('SEMANA', 'FIM_SEMANA_FERIADO')),
      valor_base_centavos INTEGER NOT NULL CHECK (valor_base_centavos >= 0),
      valor_extra_centavos INTEGER NOT NULL CHECK (valor_extra_centavos >= 0),
      ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (tipo, contexto)
    );

    CREATE TABLE IF NOT EXISTS feriados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'PERSONALIZADO')) DEFAULT 'PERSONALIZADO',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plantao_lancamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospital TEXT NOT NULL CHECK (hospital IN ('UNIMED', 'IPIS')),
      ano_mes TEXT NOT NULL,
      lancamento_id INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (hospital, ano_mes),
      FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id) ON UPDATE CASCADE ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor_alvo_centavos INTEGER NOT NULL CHECK (valor_alvo_centavos > 0),
      valor_atual_centavos INTEGER NOT NULL DEFAULT 0 CHECK (valor_atual_centavos >= 0),
      data_alvo TEXT,
      cor TEXT,
      conta_id INTEGER,
      status TEXT NOT NULL CHECK (status IN ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA')) DEFAULT 'EM_ANDAMENTO',
      observacoes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conta_id) REFERENCES contas_bancarias(id) ON UPDATE CASCADE ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS meta_aportes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meta_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      observacoes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meta_id) REFERENCES metas(id) ON UPDATE CASCADE ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS investimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ativo TEXT NOT NULL,
      classe TEXT NOT NULL CHECK (classe IN ('RENDA_FIXA', 'RENDA_VARIAVEL', 'FUNDO', 'IMOVEL', 'EXTERIOR', 'OUTRO')),
      instituicao TEXT,
      valor_investido_centavos INTEGER NOT NULL CHECK (valor_investido_centavos >= 0),
      valor_atual_centavos INTEGER NOT NULL CHECK (valor_atual_centavos >= 0),
      data_aplicacao TEXT NOT NULL,
      origem TEXT NOT NULL CHECK (origem IN ('MANUAL', 'IMPORTADO')) DEFAULT 'MANUAL',
      observacoes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plantoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      hospital TEXT NOT NULL CHECK (hospital IN ('UNIMED', 'IPIS')),
      tipo TEXT NOT NULL CHECK (tipo IN ('DIURNO', 'TARDE', 'NOTURNO', 'ESPECIAL')),
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      quantidade_horas INTEGER NOT NULL,
      quantidade_extras INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_extras >= 0),
      valor_base_centavos INTEGER NOT NULL CHECK (valor_base_centavos >= 0),
      valor_extra_unitario_centavos INTEGER NOT NULL CHECK (valor_extra_unitario_centavos >= 0),
      valor_extras_centavos INTEGER NOT NULL CHECK (valor_extras_centavos >= 0),
      valor_total_centavos INTEGER NOT NULL CHECK (valor_total_centavos >= 0),
      eh_feriado INTEGER NOT NULL DEFAULT 0 CHECK (eh_feriado IN (0, 1)),
      eh_fim_semana INTEGER NOT NULL DEFAULT 0 CHECK (eh_fim_semana IN (0, 1)),
      usa_valor_fim_semana INTEGER NOT NULL DEFAULT 0 CHECK (usa_valor_fim_semana IN (0, 1)),
      observacoes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos(tipo);
    CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos(status);
    CREATE INDEX IF NOT EXISTS idx_lancamentos_vencimento ON lancamentos(data_vencimento);
    CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria ON lancamentos(categoria);
    CREATE INDEX IF NOT EXISTS idx_contas_bancarias_ativa ON contas_bancarias(ativa);
    CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON faturas_cartao(data_vencimento);
    CREATE INDEX IF NOT EXISTS idx_fatura_itens_fatura ON fatura_itens(fatura_id);
    CREATE INDEX IF NOT EXISTS idx_fatura_itens_categoria ON fatura_itens(categoria_id);
    CREATE INDEX IF NOT EXISTS idx_fatura_itens_data_compra ON fatura_itens(data_compra);
    CREATE INDEX IF NOT EXISTS idx_plantoes_data ON plantoes(data);
    CREATE INDEX IF NOT EXISTS idx_plantoes_hospital_mes ON plantoes(hospital, data);
    CREATE INDEX IF NOT EXISTS idx_plantao_lancamentos_mes ON plantao_lancamentos(ano_mes);
    CREATE INDEX IF NOT EXISTS idx_metas_status ON metas(status);
    CREATE INDEX IF NOT EXISTS idx_meta_aportes_meta ON meta_aportes(meta_id);
    CREATE INDEX IF NOT EXISTS idx_investimentos_classe ON investimentos(classe);
  `);

  const contaColumns = db.prepare('PRAGMA table_info(contas_bancarias)').all().map((column) => column.name);
  if (!contaColumns.includes('banco_id')) {
    db.exec('ALTER TABLE contas_bancarias ADD COLUMN banco_id INTEGER REFERENCES bancos(id) ON UPDATE CASCADE ON DELETE RESTRICT;');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_contas_bancarias_banco ON contas_bancarias(banco_id);');

  const lancamentoColumns = db.prepare('PRAGMA table_info(lancamentos)').all().map((column) => column.name);
  if (!lancamentoColumns.includes('conta_id')) {
    db.exec('ALTER TABLE lancamentos ADD COLUMN conta_id INTEGER REFERENCES contas_bancarias(id) ON UPDATE CASCADE ON DELETE RESTRICT;');
    db.exec('CREATE INDEX IF NOT EXISTS idx_lancamentos_conta ON lancamentos(conta_id);');
  }

  const plantaoColumns = db.prepare('PRAGMA table_info(plantoes)').all().map((column) => column.name);
  if (!plantaoColumns.includes('recorrencia_grupo')) {
    db.exec('ALTER TABLE plantoes ADD COLUMN recorrencia_grupo TEXT;');
  }
  if (!plantaoColumns.includes('recorrencia_tipo')) {
    db.exec('ALTER TABLE plantoes ADD COLUMN recorrencia_tipo TEXT;');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_plantoes_recorrencia ON plantoes(recorrencia_grupo, data);');

  const defaults = [
    ['Moradia', 'PAGAR'], ['Alimentacao', 'PAGAR'], ['Energia', 'PAGAR'],
    ['Internet', 'PAGAR'], ['Transporte', 'PAGAR'], ['Salario', 'RECEBER'],
    ['Clientes', 'RECEBER'], ['Impostos', 'PAGAR'], ['Outros', 'AMBOS']
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO categorias (nome, tipo) VALUES (?, ?)');
  const tx = db.transaction(() => defaults.forEach((item) => insert.run(...item)));
  tx();

  const bancosPadrao = [
    ['Banco do Brasil', '001'],
    ['Bradesco', '237'],
    ['Caixa Economica Federal', '104'],
    ['Itau', '341'],
    ['Santander', '033'],
    ['Nubank', '260'],
    ['Inter', '077'],
    ['BTG Pactual', '208'],
    ['C6 Bank', '336'],
    ['Sicredi', '748'],
    ['Sicoob', '756'],
    ['Outro', null]
  ];
  const insertBanco = db.prepare('INSERT OR IGNORE INTO bancos (nome, codigo) VALUES (?, ?)');
  const txBancos = db.transaction(() => bancosPadrao.forEach((item) => insertBanco.run(...item)));
  txBancos();

  const bancosDigitados = db.prepare(`
    SELECT DISTINCT TRIM(banco) nome
    FROM contas_bancarias
    WHERE banco IS NOT NULL AND TRIM(banco) <> ''
  `).all();
  const txBancosDigitados = db.transaction(() => {
    bancosDigitados.forEach((item) => insertBanco.run(item.nome, null));
    db.prepare(`
      UPDATE contas_bancarias
      SET banco_id = (
        SELECT id FROM bancos WHERE bancos.nome = TRIM(contas_bancarias.banco)
      )
      WHERE banco_id IS NULL
        AND banco IS NOT NULL
        AND TRIM(banco) <> ''
    `).run();
  });
  txBancosDigitados();

  const valoresPlantao = [
    ['DIURNO', 'SEMANA', 69300, 4747],
    ['TARDE', 'SEMANA', 69300, 4747],
    ['NOTURNO', 'SEMANA', 154900, 6000],
    ['ESPECIAL', 'SEMANA', 77450, 4747],
    ['DIURNO', 'FIM_SEMANA_FERIADO', 85600, 6171],
    ['TARDE', 'FIM_SEMANA_FERIADO', 85600, 6171],
    ['NOTURNO', 'FIM_SEMANA_FERIADO', 171200, 6700],
    ['ESPECIAL', 'FIM_SEMANA_FERIADO', 85600, 6171]
  ];
  const insertPlantaoValor = db.prepare(`
    INSERT OR IGNORE INTO plantao_valores (tipo, contexto, valor_base_centavos, valor_extra_centavos)
    VALUES (?, ?, ?, ?)
  `);
  const txPlantaoValores = db.transaction(() => valoresPlantao.forEach((item) => insertPlantaoValor.run(...item)));
  txPlantaoValores();
}
