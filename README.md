# Controle Financeiro — Contas a Pagar e Receber

Aplicação full stack para marcar e acompanhar **contas a pagar** e **contas a receber**.

## O que existe hoje

### Dashboard
- Totais do mês atual: a receber/pagar pendente, já recebido/pago, saldo projetado
- Contadores de contas vencidas, vencendo hoje e nos próximos 7 dias
- Lista dos próximos vencimentos

### Lançamentos
- Criar, editar, excluir e visualizar contas (`PAGAR` / `RECEBER`)
- Campos: descrição, categoria, valor, vencimento, status, observações
- Status: `PENDENTE`, `CONCLUIDO`, `CANCELADO`
- Concluir, reabrir e cancelar pela interface
- Filtros por status, período, descrição; ordenação e paginação
- **Recorrência só na criação**: frequências semanal, quinzenal, mensal ou anual + quantidade de parcelas (1–120). O sistema gera N lançamentos com vencimentos espaçados; se N > 1, todos ficam com o mesmo `recorrencia_grupo`. Na edição não há recorrência. Quantidade 1 gera um único lançamento (grupo fica vazio).

### Categorias
- CRUD com tipo `PAGAR`, `RECEBER` ou `AMBOS`
- Não é possível excluir categoria em uso
- Categorias padrão na primeira execução (Moradia, Alimentação, Salário, etc.)

### Relatórios
- Resumo do período
- Totais por categoria
- Evolução por mês
- Gráficos no frontend (Recharts)

### Exportação e backup
- Exportação CSV dos lançamentos
- Criar / listar / baixar backup do SQLite em **Configurações**
- Restauração: manual (parar o servidor, substituir o arquivo do banco e subir de novo)

### Interface
- Tema claro/escuro (preferência no navegador)
- Layout responsivo com páginas: Dashboard, Lançamentos, Categorias, Relatórios, Configurações

### Fora do escopo atual
- Login / multi-usuário
- Importação CSV/JSON
- Restauração de backup pela UI
- Metas, orçamento, cartões de crédito ou múltiplas carteiras
- Edição/cancelamento em lote de uma série recorrente

---

## Arquitetura

- **Backend:** Node.js, Express, SQLite (`better-sqlite3`), Zod, dotenv, Helmet, CORS, rate limit
- **Frontend:** React, Vite, React Router, Recharts, CSS próprio
- **Banco:** criado automaticamente em `backend/data/financeiro.sqlite`
- **Valores:** em centavos
- **Datas de negócio:** `YYYY-MM-DD` (evita mudança de dia por fuso)

```text
controle-financeiro/
├── backend/          API REST + SQLite
├── frontend/         Interface React
├── scripts/          controle.bat / controle.ps1
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Modelo do banco

**categorias:** `id`, `nome`, `tipo`, `created_at`, `updated_at`

**lancamentos:** `id`, `tipo`, `descricao`, `categoria_id`, `categoria`, `valor_centavos`, `data_vencimento`, `data_pagamento`, `status`, `observacoes`, `recorrencia_grupo`, `created_at`, `updated_at`

---

## API (prefixo `/api`)

| Método | Rota | Função |
|--------|------|--------|
| GET | `/health` | Health check |
| GET/POST | `/lancamentos` | Listar / criar |
| GET/PUT/DELETE | `/lancamentos/:id` | Detalhe / editar / excluir |
| PATCH | `/lancamentos/:id/concluir` | Marcar como pago/recebido |
| PATCH | `/lancamentos/:id/reabrir` | Voltar para pendente |
| PATCH | `/lancamentos/:id/cancelar` | Cancelar |
| GET/POST | `/categorias` | Listar / criar |
| PUT/DELETE | `/categorias/:id` | Editar / excluir |
| GET | `/dashboard/resumo` | Resumo do mês |
| GET | `/dashboard/proximos-vencimentos` | Próximos vencimentos |
| GET | `/relatorios/resumo` | Relatório do período |
| GET | `/relatorios/por-categoria` | Por categoria |
| GET | `/relatorios/por-mes` | Por mês |
| GET | `/exportacoes/csv` | Exportar CSV |
| GET/POST | `/backups` | Listar / criar backup |
| GET | `/backups/:arquivo/download` | Baixar backup |

---

## Execução local (Windows)

Pré-requisito: **Node.js 22 LTS** ou superior.

### Forma recomendada

```bat
cd "D:\Projetos\Planilha Financeira\controle-financeiro"
.\controle.bat
```

- Sobe backend e frontend
- `Ctrl+C` no terminal do script → **[P]**arar, **[R]**einiciar ou **[C]**ontinuar
- Atalhos: `.\controle.bat parar` | `.\controle.bat reiniciar`
- Compatibilidade: `.\scripts\controle.bat` e `.\script\controle.bat` tambem funcionam.

### Manual

```bash
# Backend
cd backend
npm install
copy .env.example .env
npm run dev

# Frontend (outro terminal)
cd frontend
npm install
copy .env.example .env
npm run dev
```

### URLs (desenvolvimento)

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| Health | http://localhost:3001/api/health |

Porta do backend: `PORT` em `backend/.env` (padrão do exemplo: **3001**).  
Frontend aponta para a API via `VITE_API_URL` em `frontend/.env`.

### Seed (opcional)

```bash
cd backend
npm run seed
```

Não duplica dados se já houver seed anterior.

### Testes e build

```bash
cd backend
npm test

cd ../frontend
npm test
npm run build
```

---

## Deploy com Docker (VPS)

No Docker a aplicação usa a porta **3000** dentro do container (diferente do dev local em 3001).

1. Instale Docker e Docker Compose
2. Copie o projeto para a VPS
3. Ajuste `CORS_ORIGINS` em `docker-compose.yml` para o domínio real
4. Suba:

```bash
docker compose up -d --build
```

Dados em volume `financeiro_data` (`/app/data`); backups em `/app/backups`.

### Nginx (exemplo)

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

```bash
sudo ln -s /etc/nginx/sites-available/controle-financeiro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br
sudo systemctl status certbot.timer
```

### Backup e restauração

Pela UI: **Configurações → Criar backup**. Pela API (dev local):

```bash
curl -X POST http://localhost:3001/api/backups
```

Restaurar no Docker:

```bash
docker compose down
docker run --rm -v controle-financeiro_financeiro_data:/data -v ./backup:/backup alpine sh -c "cp /backup/financeiro.sqlite /data/financeiro.sqlite"
docker compose up -d
```

### Atualizar produção

```bash
git pull
docker compose up -d --build
```
