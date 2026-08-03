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

    CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos(tipo);
    CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos(status);
    CREATE INDEX IF NOT EXISTS idx_lancamentos_vencimento ON lancamentos(data_vencimento);
    CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria ON lancamentos(categoria);
    CREATE INDEX IF NOT EXISTS idx_contas_bancarias_ativa ON contas_bancarias(ativa);
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
}
