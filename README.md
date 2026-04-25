# Oficina Mecanica API

Backend MVP para gestao de oficina mecanica (clientes, veiculos, servicos, pecas e ordens de servico).

## Stack

- Node.js + TypeScript
- Fastify
- Prisma + PostgreSQL
- Vitest
- Docker / Docker Compose

## Rodar local

### 1) Iniciar o projeto

- configurar .env 

```bash
npm install
```

### 2) Subir banco / ou rodar com URL do banco Neon de PROD

```bash
docker compose up -d db
```

### 3) Migrar banco e iniciar API

```bash
npm run db:generate
npm run db:migrate
npm run dev
```

API: `http://localhost:3000`
Swagger: `http://localhost:3000/docs`
Health: `http://localhost:3000/health`

### 4) (Opcional) Seed de admin

```bash
npm run db:seed
```

Credenciais padrao (via `.env`):
- email: `admin@oficina.com`
- senha: `Admin@123`

## Rodar com Docker (API + DB)

```bash
docker compose up --build
```

Backend vai subir na porta padrão `http://localhost:3000`.

## Testes

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
```

## Scripts 

```bash
npm run build
npm run start
npm run lint
npm run typecheck
npm run db:studio
```
