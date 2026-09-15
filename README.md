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
- Aprovação/rejeição de orçamento pelo próprio cliente, direto na tela pública de acompanhamento
- Envio dos dados da OS por **e-mail** a partir da tela pública de acompanhamento (Nodemailer, com fallback automático para Ethereal em dev)

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
- **Sistema de Aprovacao**: Orcamentos que precisam aprovacao antes da execucao — pelo painel admin ou diretamente pelo cliente na tela publica de acompanhamento
- **Envio por E-mail**: cliente pode pedir o envio dos dados da OS (resumo, status, orcamento) para um e-mail informado na hora, sem persistir o endereco
- **Estatisticas**: Dashboard com estatisticas de servicos executados

### Controle de Acesso

- Autenticacao obrigatoria via JWT
- Soft delete de registros (nao apaga fisicamente)
- Validacao de integridade (veiculo deve pertencer ao cliente)

## Stack Tecnologico

- **Runtime**: Node.js + TypeScript
- **Framework Web**: Fastify
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **E-mail**: Nodemailer (SMTP configuravel; sem `SMTP_USER` cai automaticamente para uma conta de teste Ethereal)
- **Testes**: Vitest (146 testes unitarios + 24 testes de integracao)
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

## Arquitetura da Solucao (Fase 2)

Componentes da aplicacao, infraestrutura provisionada e fluxo de deploy:

```mermaid
flowchart TB
  Client["Cliente / Front-end"] -->|HTTP| Svc

  subgraph API["Arquitetura de codigo (Clean Architecture)"]
    Routes["Routes"] --> UseCases["Use Cases"]
    UseCases --> Domain["Domain"]
    UseCases --> Repos["Prisma Repositories"]
  end

  API -. roda dentro de .-> Deploy

  subgraph K8s["Kubernetes (cluster EKS - castor-garage-k8s-infra)"]
    direction TB
    CM["ConfigMap"] --> Deploy
    Secret["Secret"] --> Deploy
    HPA["HorizontalPodAutoscaler"] -. escala .-> Deploy["Deployment castor-garage-api (2-10 replicas)"]
    Svc["Service :3000"] --> Deploy
  end

  Deploy --> RDS["RDS PostgreSQL (castor-garage-db-infra)"]

  subgraph CICD["CI/CD (GitHub Actions)"]
    direction LR
    J1["test"] --> J2["build"] --> J3["deploy"]
  end

  J3 -. publica nova imagem .-> Deploy
```

- **Kubernetes** (`/k8s/api`) mantem a API rodando com auto-scaling (HPA por CPU/memoria); namespace, ConfigMap, Secret e o cluster em si sao provisionados pelo repo `castor-garage-k8s-infra`.
- **Banco de dados**: PostgreSQL gerenciado (RDS), provisionado pelo repo `castor-garage-db-infra`; a API so recebe a `DATABASE_URL` via Secret.
- **CI/CD** (`.github/workflows/pipeline.yml`) builda, testa, publica a imagem no GHCR e faz o deploy da nova versao no cluster a cada push em `main`.

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

Pre-requisito: namespace, ConfigMap, Secret e o cluster EKS ja provisionados
pelo repo `castor-garage-k8s-infra`; o banco (RDS) provisionado pelo repo
`castor-garage-db-infra`. Este repo so cuida do deploy da API em si.

**1. Build e push da imagem** (substitua `YOUR_REGISTRY`):
```bash
docker build -t YOUR_REGISTRY/mecanica-api:latest .
docker push YOUR_REGISTRY/mecanica-api:latest
```

Atualize o campo `image` em `k8s/api/deployment.yaml`.

**2. Aplique os manifestos da API:**
```bash
kubectl apply -f k8s/api/
```

**3. Verifique o deploy:**
```bash
kubectl get pods -n castor-garage -w
kubectl get hpa -n castor-garage
```

### Estrutura dos manifestos (`/k8s`)

```
k8s/
└── api/
    ├── deployment.yaml     # API (2 replicas base, health checks)
    ├── service.yaml        # Service
    └── hpa.yaml            # Escala de 2 a 10 pods (CPU >70%, MEM >80%)
```

Namespace, ConfigMap, Secret e a infraestrutura do cluster EKS vivem no repo
`castor-garage-k8s-infra`. A infraestrutura do banco (RDS PostgreSQL) vive no
repo `castor-garage-db-infra`. Ver [ADR 0003](docs/adr/0003-split-em-4-repos.md).

## CI/CD (`.github/workflows/pipeline.yml`)

Pipeline no GitHub Actions com 3 jobs encadeados, disparada em push/PR para
`main`:

1. **`test`** — instala dependencias, gera o Prisma Client, roda
   `typecheck`, testes unitarios e testes de integracao (com um servico
   `postgres:16-alpine` no runner).
2. **`build`** — builda a imagem Docker e publica em
   `ghcr.io/castor-garage/mecanica-pos-soat` (tags `latest` e `<sha>`).
3. **`deploy`** (so em push para `main`) — autentica na AWS com as
   credenciais temporarias do Academy Learner Lab (secrets do GitHub),
   aponta o `kubectl` para o cluster EKS ja provisionado pelo repo
   `castor-garage-k8s-infra`, aplica `k8s/api/` com a tag da imagem do commit,
   aguarda o rollout, descobre o hostname do Network Load Balancer, faz um
   smoke test em `/health` e verifica o `HorizontalPodAutoscaler`.

Esse job publica a nova versao a cada push num ambiente **persistente** na
AWS — o cluster fica no ar entre execucoes, pronto pra usar no video
demonstrativo (deploy, execucao do CI/CD, consumo das APIs, escalabilidade
automatica).

## Testes

```bash
# Unitarios (recomendado para CI/CD)
npm run test:unit

# Integracao + Unitarios (requer PostgreSQL rodando)
npm run test:all

# Cobertura
npm run test:coverage
```

Status atual: **146 testes unitarios** e **24 testes de integracao** passando.

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

# SMTP (envio de dados da OS por e-mail). Deixe SMTP_USER vazio para usar
# automaticamente uma conta de teste Ethereal (sem cadastro, so para dev).
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@oficina.com

# Nivel dos logs JSON (fora de development). Padrao: info
LOG_LEVEL=info
```

## Observabilidade

Fora de `development`, a API escreve logs em JSON (uma linha por log) com um `requestId` por requisicao. O id e reaproveitado do header `x-request-id` quando o chamador envia (ex.: API Gateway) e volta na resposta. Abertura de OS, mudancas de status e falhas de processamento ou de integracao saem como eventos de negocio (campo `event`), base para os dashboards e alertas. Catalogo de eventos e sugestoes de consultas em [`docs/observabilidade.md`](docs/observabilidade.md).

## Documentacao da Arquitetura (Fase 3)

- **Diagrama de Componentes**: [`docs/component-diagram.mmd`](docs/component-diagram.mmd) — visao de nuvem completa (API Gateway, Lambdas, EKS, RDS, New Relic, CI/CD dos 4 repositorios).
- **Diagramas de Sequencia**: [`docs/sequence-auth-flow.mmd`](docs/sequence-auth-flow.mmd) (autenticacao por CPF) e [`docs/sequence-os-opening.mmd`](docs/sequence-os-opening.mmd) (abertura de OS).
- **Modelo de dominio (ER)**: [`docs/modelo-dominio.mmd`](docs/modelo-dominio.mmd) e [`docs/linguagem-ubiqua.md`](docs/linguagem-ubiqua.md).
- **RFCs**: [`docs/rfc/`](docs/rfc/) — escolha de nuvem, banco de dados e estrategia de autenticacao.
- **ADRs**: [`docs/adr/`](docs/adr/) — padrao de comunicacao, uso de HPA, split em 4 repositorios, RDS vs banco em cluster, cluster unico multi-namespace.
- Repositorios relacionados (Fase 3): `castor-garage-auth-lambda`, `castor-garage-k8s-infra`, `castor-garage-db-infra` _(links a adicionar quando publicados)_.

## Principais Endpoints

### Autenticacao
As rotas de clientes, veiculos, servicos, pecas e ordens de servico exigem `Authorization: Bearer <token>`. O token carrega o perfil (`role`):
- `POST /auth/login` — login do administrador (token com `role: admin`)
- Cliente: token com `role: client`, emitido pela Lambda de autenticacao por CPF (repositorio separado, Fase 3)

### Clientes
- `GET /clients` — listar (paginado)
- `GET /clients/:id`
- `POST /clients`
- `PUT /clients/:id` — inclui `status` (`ATIVO`/`INATIVO`/`BLOQUEADO`); so cliente `ATIVO` recebe token
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
- `GET /service-orders/:id` — cliente dono da OS ou admin
- `GET /service-orders/track/:orderNumber` — consulta por numero da OS; cliente dono da OS ou admin
- `POST /service-orders` — abertura de OS
- `POST /service-orders/:id/approve` — aprovar orcamento (admin)
- `POST /service-orders/:id/reject` — rejeitar orcamento (admin)
- `POST /service-orders/:id/advance` — avancar status
- `POST /service-orders/:id/send-email` — cliente dono da OS ou admin; envia os dados da OS para um e-mail informado na hora (nao persistido)
- `POST /service-orders/track/:orderNumber/approve` — cliente dono da OS aprova o orcamento pela tela de acompanhamento
- `POST /service-orders/track/:orderNumber/reject` — cliente dono da OS rejeita o orcamento pela tela de acompanhamento

Cliente tentando acessar OS de outro cliente recebe `404`, igual a uma OS inexistente.
- `GET /service-orders/stats` — estatisticas de servicos

### Webhook
- `POST /webhooks/email` — atualizacao de status via e-mail

### Utilitarios
- `GET /health`
- `GET /docs` — Swagger UI
