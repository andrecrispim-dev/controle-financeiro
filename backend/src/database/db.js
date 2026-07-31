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
  `);

  const defaults = [
    ['Moradia', 'PAGAR'], ['Alimentacao', 'PAGAR'], ['Energia', 'PAGAR'],
    ['Internet', 'PAGAR'], ['Transporte', 'PAGAR'], ['Salario', 'RECEBER'],
    ['Clientes', 'RECEBER'], ['Impostos', 'PAGAR'], ['Outros', 'AMBOS']
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO categorias (nome, tipo) VALUES (?, ?)');
  const tx = db.transaction(() => defaults.forEach((item) => insert.run(...item)));
  tx();
}
