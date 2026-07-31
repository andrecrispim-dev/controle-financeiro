# Frontend - Controle Financeiro

Interface React/Vite em portugues do Brasil para consumir a API do backend.

## Execucao

```bash
npm install
copy .env.example .env
npm run dev
```

URL padrao: `http://localhost:5173`.

Configure `VITE_API_URL` se a API estiver em outro endereco.

## Build

```bash
npm run build
```

O build gera `dist/`, que e copiado para o backend no Docker de producao.
