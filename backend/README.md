# Backend - Controle Financeiro

API REST em Node.js, Express e SQLite para contas a pagar e receber.

## Execucao local

```bash
npm install
copy .env.example .env
npm run dev
```

URL padrao: `http://localhost:3001`.

## Scripts

- `npm run dev`: inicia em desenvolvimento.
- `npm start`: inicia em producao/local.
- `npm run seed`: cria dados de demonstracao sem duplicar.
- `npm test`: executa testes automatizados.

## Banco

O SQLite e criado automaticamente no caminho `DB_FILE`. Em producao Docker, use `/app/data/financeiro.sqlite` com volume persistente.

## Backup e restauracao

Crie backups via `POST /api/backups`. Para restaurar, pare o servidor, copie o arquivo `.sqlite` desejado para o caminho configurado em `DB_FILE` e reinicie a aplicacao.
