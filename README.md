# Sistema Web de Contas a Pagar e Receber

Aplicacao full stack para controle financeiro basico, com API REST em Node.js/Express/SQLite e frontend React/Vite.

## Arquitetura

- Backend: Node.js, Express, SQLite, dotenv, helmet, CORS, rate limit, Zod, tratamento centralizado de erros.
- Frontend: React com Vite, React Router, Recharts, CSS tradicional responsivo, tema claro/escuro.
- Banco: SQLite criado automaticamente em `backend/data/financeiro.sqlite`.
- Deploy: Docker com volume persistente para `/app/data` e `/app/backups`.

## Estrutura

```text
controle-financeiro/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── data/
│   ├── backups/
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
├── scripts/
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Modelo do banco

Tabela `lancamentos`: `id`, `tipo`, `descricao`, `categoria_id`, `categoria`, `valor_centavos`, `data_vencimento`, `data_pagamento`, `status`, `observacoes`, `recorrencia_grupo`, `created_at`, `updated_at`.

Tabela `categorias`: `id`, `nome`, `tipo`, `created_at`, `updated_at`.

Valores monetarios sao armazenados em centavos. Datas de negocio usam `YYYY-MM-DD` para evitar mudanca de dia por fuso horario.

## Rotas principais

- `GET /api/lancamentos`
- `GET /api/lancamentos/:id`
- `POST /api/lancamentos`
- `PUT /api/lancamentos/:id`
- `DELETE /api/lancamentos/:id`
- `PATCH /api/lancamentos/:id/concluir`
- `PATCH /api/lancamentos/:id/reabrir`
- `PATCH /api/lancamentos/:id/cancelar`
- `GET /api/dashboard/resumo`
- `GET /api/dashboard/proximos-vencimentos`
- `GET /api/relatorios/resumo`
- `GET /api/relatorios/por-categoria`
- `GET /api/relatorios/por-mes`
- `GET /api/categorias`
- `POST /api/categorias`
- `PUT /api/categorias/:id`
- `DELETE /api/categorias/:id`
- `GET /api/exportacoes/csv`
- `POST /api/backups`
- `GET /api/backups`
- `GET /api/backups/:arquivo/download`

## Execucao local no Windows

Pre-requisitos: Node.js 22 LTS ou superior.

Backend:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

Script de controle (unico ponto de entrada):

- `scripts/controle.bat` — inicia backend + frontend e fica aguardando
- Com os servicos rodando, `Ctrl+C` pergunta: **[P]**arar, **[R]**einiciar ou **[C]**ontinuar
- Atalhos: `controle.bat parar` | `controle.bat reiniciar`

## Dados iniciais

```bash
cd backend
npm run seed
```

O seed e opcional e nao duplica dados.

## Testes e build

```bash
cd backend
npm test

cd ../frontend
npm test
npm run build
```

## Deploy com Docker em VPS Linux

1. Instale Docker e Docker Compose.
2. Copie o projeto para a VPS.
3. Ajuste `CORS_ORIGINS` em `docker-compose.yml` para o dominio real.
4. Execute:

```bash
docker compose up -d --build
```

O banco fica no volume `financeiro_data`, montado em `/app/data`, e nao e perdido em reinicios do container.

## Nginx como proxy reverso

Exemplo em `/etc/nginx/sites-available/controle-financeiro`:

```nginx
server {
    server_name seudominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/controle-financeiro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS com Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br
sudo systemctl status certbot.timer
```

O Certbot instala renovacao automatica via timer.

## Backup e restauracao

Pelo sistema, use Configuracoes > Criar backup. Pela API:

```bash
curl -X POST http://localhost:3001/api/backups
```

Para restaurar em Docker:

```bash
docker compose down
docker run --rm -v controle-financeiro_financeiro_data:/data -v ./backup:/backup alpine sh -c "cp /backup/financeiro.sqlite /data/financeiro.sqlite"
docker compose up -d
```

## Atualizacao em producao

```bash
git pull
docker compose up -d --build
```

Os dados permanecem no volume persistente.
