# 🔧 Mecânica POS - API

**Backend MVP** para gestão completa de oficina mecânica com controle de clientes, veículos, serviços, peças e ordens de trabalho.

Projeto desenvolvido para a turma 2026 de **SOAT - FIAP** sob a metodologia **Clean Architecture** com alta cobertura de testes unitários.

## 👥 Membros do Time

| Nome | RM | Discord |
|------|-----|---------|
| Carlos Henrique Furtado | 371256 | kmzsonequinha |
| Luiz Otávio Leitão | 370255 | _louizzz |
| Vitor Cruz dos Santos | 371411 | vsacz |



## 📚 Funcionalidades

### ✅ Módulos Implementados

- **Autenticação**: Sistema de login JWT para administradores
- **Gestão de Clientes**: CRUD de clientes (PF/PJ) com validação de CPF/CNPJ
- **Gestão de Veículos**: Cadastro e histórico de veículos por cliente
- **Catálogo de Serviços**: CRUD de serviços com preço base e tempo estimado
- **Catálogo de Peças**: CRUD de peças com controle de estoque
- **Ordens de Serviço**: Fluxo completo de OS com status (Recebida → Finalizada → Entregue)
- **Sistema de Aprovação**: Orçamentos que precisam aprovação antes da execução
- **Estatísticas**: Dashboard com estatísticas de serviços executados

### 🔐 Controle de Acesso

- Autenticação obrigatória via JWT
- Soft delete de registros (não apaga fisicamente)
- Validação de integridade (veículo deve pertencer ao cliente)

## 🏗️ Stack Tecnológico

- **Runtime**: Node.js + TypeScript
- **Framework Web**: Fastify
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **Testes**: Vitest (142 testes unitários ✅)
- **Containerização**: Docker / Docker Compose
- **Documentação**: Swagger/OpenAPI

## 🏛️ Arquitetura

O projeto segue o padrão **Clean Architecture** com separação clara de responsabilidades:

```
src/
├── application/        # Use Cases - lógica de negócio
│   └── use-cases/
│       ├── auth/
│       ├── client/
│       ├── part/
│       ├── service/
│       ├── vehicle/
│       └── service-order/
├── domain/            # Entidades e regras de negócio
│   ├── admin/
│   ├── client/
│   ├── part/
│   ├── service/
│   ├── vehicle/
│   └── service-order/
├── infrastructure/    # Implementações técnicas
│   ├── database/      # Prisma repositories
│   └── http/          # Fastify routes & server
└── shared/            # Código compartilhado
    ├── errors/        # AppError, NotFoundError, etc
    └── types/         # Tipos globais
```

## 📊 Status dos Testes

✅ **142 testes unitários** em execução
- 19 testes: Shared Errors
- 4 testes: Auth Use Cases
- 15 testes: Client Use Cases
- 11 testes: Part Use Cases
- 11 testes: Service Use Cases
- 15 testes: Vehicle Use Cases
- 23 testes: Service Order Use Cases
- 44 testes: Domain Value Objects

```bash
Test Files  11 passed (11)
Tests       142 passed (142)
Duration    ~350ms
```

## 🔧 Stack

## 🚀 Como Rodar Local

### 1) Iniciar o projeto

Configurar `.env`:

```bash
npm install
```

### 2) Subir banco de dados

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

Credenciais padrão (via `.env`):
- email: `admin@oficina.com`
- senha: `Admin@123`

## 🐳 Rodar com Docker (API + DB)

```bash
docker compose up --build
```

Backend vai subir na porta padrão `http://localhost:3000`.

## 📡 Principais Endpoints

### 🔐 Autenticação
- `POST /admin/login` - Login admin (retorna JWT)

### 👥 Clientes
- `GET /clients` - Listar clientes (paginado)
- `GET /clients/:id` - Buscar cliente por ID
- `POST /clients` - Criar novo cliente
- `PUT /clients/:id` - Atualizar cliente
- `DELETE /clients/:id` - Deletar cliente (soft delete)

### 🚗 Veículos
- `GET /vehicles` - Listar veículos
- `GET /vehicles/:id` - Buscar veículo
- `POST /vehicles` - Criar veículo
- `PUT /vehicles/:id` - Atualizar veículo
- `DELETE /vehicles/:id` - Deletar veículo

### 🔧 Serviços
- `GET /services` - Listar serviços
- `GET /services/:id` - Buscar serviço
- `POST /services` - Criar serviço
- `PUT /services/:id` - Atualizar serviço
- `DELETE /services/:id` - Deletar serviço

### 🛠️ Peças
- `GET /parts` - Listar peças
- `GET /parts/:id` - Buscar peça
- `POST /parts` - Criar peça
- `PUT /parts/:id` - Atualizar peça
- `DELETE /parts/:id` - Deletar peça

### 📋 Ordens de Serviço
- `GET /service-orders` - Listar OS
- `GET /service-orders/:id` - Buscar OS
- `POST /service-orders` - Criar OS
- `PATCH /service-orders/:id/approve` - Aprovar orçamento
- `PATCH /service-orders/:id/reject` - Rejeitar orçamento
- `PATCH /service-orders/:id/advance` - Avançar status
- `GET /service-orders/stats/services` - Estatísticas de serviços

### 📊 Health Check
- `GET /health` - Status da API
- `GET /docs` - Swagger UI

## ✅ Testes

## ✅ Testes

### Executar Testes

```bash
# Apenas unitários (recomendado para CI/CD)
npm test

# Apenas unitários (mesmo resultado)
npm run test:unit

# Integração + Unitários (requer PostgreSQL rodando)
npm run test:all

# Cobertura de testes
npm run test:coverage

# Modo watch (desenvolvimento)
npm run test:watch
```

## 📦 Scripts Disponíveis

```bash
# Build & Execução
npm run build           # Compilar TypeScript
npm run dev            # Rodar em desenvolvimento com hot-reload
npm start              # Executar build compilado

# Banco de Dados
npm run db:generate    # Gerar Prisma Client
npm run db:migrate     # Migrar banco (desenvolvimento)
npm run db:migrate:deploy  # Deploy de migrações (produção)
npm run db:seed        # Popular admin padrão
npm run db:studio      # UI do Prisma Studio

# Qualidade de Código
npm run lint           # ESLint
npm run lint:fix       # ESLint com auto-fix
npm run typecheck      # TypeScript strict check
```

## 🌍 Deployment

### Variáveis de Ambiente

Criar arquivo `.env`:

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=sua-chave-secreta-super-segura

# Admin Padrão
ADMIN_EMAIL=admin@oficina.com
ADMIN_PASSWORD=Admin@123
```

### Deploy em Produção

1. **Build da aplicação**
```bash
npm run build
```

2. **Gerar Prisma Client**
```bash
npm run db:generate
```

3. **Executar migrações**
```bash
npm run db:migrate:deploy
```

4. **Seed de admin (primeira vez)**
```bash
npm run db:seed
```

5. **Iniciar o servidor**
```bash
npm start
```

### Usando Docker em Produção

```bash
docker build -t mecanica-api:latest .
docker run -d -p 3000:3000 --env-file .env mecanica-api:latest
```

## 🛠️ Padrões de Desenvolvimento

### Value Objects
Classes imutáveis para validar regras de negócio (CPF, CNPJ, LicensePlate, OSStatus)

### Repositories
Abstrações para persistência em banco de dados

### Use Cases
Lógica de negócio isolada, testável e independente

### Error Handling
- `AppError`: Erro genérico com statusCode
- `NotFoundError`: Recurso não encontrado (404)
- `ConflictError`: Duplicidade de dados (409)
- `UnauthorizedError`: Falha de autenticação (401)
- `ValidationError`: Validação falhou (422)
- `BusinessRuleError`: Violação de regra de negócio (422)

## 📝 Convenções

- **Nomes de arquivos**: PascalCase para classes, camelCase para utilitários
- **Branches**: `feature/nome-feature`, `bugfix/nome-bug`
- **Commits**: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`
- **Testes**: Um arquivo teste por módulo, suffix `.test.ts`

## 📄 Licença

Projeto Oficina Castor's Mecanica API - SOAT/2026