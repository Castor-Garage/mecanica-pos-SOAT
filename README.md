# Castor Garage - API

Backend para gestão completa de oficina mecânica com controle de clientes, veículos, serviços, peças e ordens de trabalho.

Projeto desenvolvido para a turma 2026 de **SOAT - FIAP** sob a metodologia **Clean Architecture**.

## Membros do Time

| Nome | RM | Discord |
|------|-----|---------|
| Carlos Henrique Furtado | 371256 | kmzsonequinha |
| Luiz Otávio Leitão | 370255 | _louizzz |
| Vitor Cruz dos Santos | 371411 | vsacz |

---

## Fase 2 — Qualidade, Resiliência e Escalabilidade

### Objetivos

Evoluir a aplicação da Fase 1 incorporando práticas modernas de infraestrutura e automação:

- Infraestrutura escalável com **Kubernetes** e **HPA** (Horizontal Pod Autoscaler)
- Provisionamento automatizado com **Terraform**
- Pipeline de **CI/CD** completa (build → testes → Docker → deploy K8s)
- Qualidade de código com **Clean Architecture**, testes unitários e de integração
- Atualização de status de OS via integração por **e-mail (webhook)**

### Links

- **Swagger / API Docs**: `http://localhost:3000/docs` (local) ou `http://<NODE_IP>:30080/docs` (K8s)
- **Video demonstrativo**: _(a ser adicionado)_
- **Collection Postman**: _(a ser adicionado)_

---

## Funcionalidades

### Modulos Implementados

- **Autenticacao**: Sistema de login JWT para administradores
- **Gestao de Clientes**: CRUD de clientes (PF/PJ) com validacao de CPF/CNPJ
- **Gestao de Veiculos**: Cadastro e historico de veiculos por cliente
- **Catalogo de Servicos**: CRUD de servicos com preco base e tempo estimado
- **Catalogo de Pecas**: CRUD de pecas com controle de estoque
- **Ordens de Servico**: Fluxo completo de OS com status (Recebida → Finalizada → Entregue)
- **Sistema de Aprovacao**: Orcamentos que precisam aprovacao antes da execucao
- **Estatisticas**: Dashboard com estatisticas de servicos executados

### Controle de Acesso

- Autenticacao obrigatoria via JWT
- Soft delete de registros (nao apaga fisicamente)
- Validacao de integridade (veiculo deve pertencer ao cliente)

## Stack Tecnologico

- **Runtime**: Node.js + TypeScript
- **Framework Web**: Fastify
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **Testes**: Vitest (142 testes unitarios)
- **Conteinizacao**: Docker / Docker Compose
- **Orquestracao**: Kubernetes
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Documentacao**: Swagger/OpenAPI

## Arquitetura de Codigo

O projeto segue o padrao **Clean Architecture** com separacao clara de responsabilidades:

```
src/
├── application/        # Use Cases - logica de negocio
│   └── use-cases/
│       ├── auth/
│       ├── client/
│       ├── part/
│       ├── service/
│       ├── vehicle/
│       └── service-order/
├── domain/            # Entidades e regras de negocio
│   ├── admin/
│   ├── client/
│   ├── part/
│   ├── service/
│   ├── vehicle/
│   └── service-order/
├── infrastructure/    # Implementacoes tecnicas
│   ├── database/      # Prisma repositories
│   └── http/          # Fastify routes & server
└── shared/            # Codigo compartilhado
    ├── errors/
    └── types/
```

## Como Rodar Local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variaveis de ambiente

Copie `.env.example` para `.env` e ajuste os valores:

```bash
cp .env.example .env
```

### 3. Subir banco e iniciar API

```bash
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/health`

### 4. Seed de admin (opcional)

```bash
npm run db:seed
```

Credenciais padrao (via `.env`): `admin@oficina.com` / `Admin@123`

## Rodar com Docker (API + DB)

```bash
docker compose up --build
```

## Deploy em Kubernetes

Pre-requisito: cluster rodando (`minikube`, `kind` ou cloud) com `kubectl` configurado.

**1. Build e push da imagem** (substitua `YOUR_REGISTRY`):
```bash
docker build -t YOUR_REGISTRY/mecanica-api:latest .
docker push YOUR_REGISTRY/mecanica-api:latest
```

Atualize o campo `image` em `k8s/api/deployment.yaml`.

**2. Ajuste os secrets** em `k8s/secret.yaml` com os valores reais de producao.

**3. Aplique os manifestos:**
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/api/
```

**4. Verifique o deploy:**
```bash
kubectl get pods -n castor-garage -w
kubectl get hpa -n castor-garage
```

A API ficara disponivel em `http://<NODE_IP>:30080`.

### Estrutura dos manifestos (`/k8s`)

```
k8s/
├── namespace.yaml          # Namespace castor-garage
├── configmap.yaml          # Variaveis nao-sensiveis
├── secret.yaml             # Variaveis sensiveis (JWT_SECRET, DATABASE_URL, etc.)
├── postgres/
│   ├── pvc.yaml            # PersistentVolumeClaim 5Gi
│   ├── deployment.yaml     # PostgreSQL 16-alpine
│   └── service.yaml        # ClusterIP :5432
└── api/
    ├── deployment.yaml     # API (2 replicas base, health checks)
    ├── service.yaml        # NodePort :30080
    └── hpa.yaml            # Escala de 2 a 10 pods (CPU >70%, MEM >80%)
```

## Provisionamento com Terraform (`/infra`)

Scripts Terraform para provisionar o cluster Kubernetes e o banco de dados estao em `/infra`.

## Testes

```bash
# Unitarios (recomendado para CI/CD)
npm run test:unit

# Integracao + Unitarios (requer PostgreSQL rodando)
npm run test:all

# Cobertura
npm run test:coverage
```

Status atual: **142 testes unitarios** passando.

## Scripts Disponiveis

```bash
npm run build               # Compilar TypeScript
npm run dev                 # Rodar em desenvolvimento com hot-reload
npm start                   # Executar build compilado
npm run db:generate         # Gerar Prisma Client
npm run db:migrate          # Migrar banco (desenvolvimento)
npm run db:migrate:deploy   # Deploy de migracoes (producao)
npm run db:seed             # Popular admin padrao
npm run lint                # ESLint
npm run typecheck           # TypeScript strict check
```

## Variaveis de Ambiente

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=sua-chave-secreta
JWT_EXPIRES_IN=8h
ADMIN_EMAIL=admin@oficina.com
ADMIN_PASSWORD=Admin@123
WEBHOOK_SECRET=token-opcional-para-webhook
```

## Principais Endpoints

### Autenticacao
- `POST /admin/login`

### Clientes
- `GET /clients` — listar (paginado)
- `GET /clients/:id`
- `POST /clients`
- `PUT /clients/:id`
- `DELETE /clients/:id`

### Veiculos
- `GET /vehicles`
- `GET /vehicles/:id`
- `POST /vehicles`
- `PUT /vehicles/:id`
- `DELETE /vehicles/:id`

### Servicos
- `GET /services`
- `GET /services/:id`
- `POST /services`
- `PUT /services/:id`
- `DELETE /services/:id`

### Pecas
- `GET /parts`
- `GET /parts/:id`
- `POST /parts`
- `PUT /parts/:id`
- `DELETE /parts/:id`

### Ordens de Servico
- `GET /service-orders` — listagem com ordenacao por status (excluindo finalizadas/entregues)
- `GET /service-orders/:id`
- `GET /service-orders/track/:orderNumber` — consulta publica por numero da OS
- `POST /service-orders` — abertura de OS
- `POST /service-orders/:id/approve` — aprovar orcamento
- `POST /service-orders/:id/reject` — rejeitar orcamento
- `POST /service-orders/:id/advance` — avancar status
- `GET /service-orders/stats` — estatisticas de servicos

### Webhook
- `POST /webhooks/email` — atualizacao de status via e-mail

### Utilitarios
- `GET /health`
- `GET /docs` — Swagger UI
