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

  subgraph EKS["Cluster EKS (provisionado por mecanica-k8s-infra-SOAT)"]
    direction TB
    CM["ConfigMap"] --> Deploy
    Secret["Secret (aplicado manualmente)"] --> Deploy
    HPA["HorizontalPodAutoscaler"] -. escala .-> Deploy["Deployment castor-garage-api (kustomize: production/staging)"]
    Svc["Service LoadBalancer"] --> Deploy
  end

  Repos -.->|"DATABASE_URL"| RDS[("RDS PostgreSQL\n(mecanica-db-infra-SOAT)")]

  subgraph CICD["CI/CD deste repo (GitHub Actions)"]
    direction LR
    J1["test"] --> J2["build"] --> J3["deploy-production / deploy-staging"]
  end

  J3 -. "kubectl apply -k k8s/api/overlays/*" .-> Deploy
```

- **Kubernetes** (`/k8s/api`) mantem a API rodando com auto-scaling (HPA por CPU/memoria) e configuracao via ConfigMap/Secret, usando Kustomize (`base` + overlays `production`/`staging`). O cluster em si (EKS, node group, metrics-server, StorageClass) e provisionado à parte, em [`mecanica-k8s-infra-SOAT`](https://github.com/Castor-Garage/mecanica-k8s-infra-SOAT).
- **Banco de dados**: RDS PostgreSQL gerenciado, provisionado em [`mecanica-db-infra-SOAT`](https://github.com/Castor-Garage/mecanica-db-infra-SOAT) — este repositorio so consome a `DATABASE_URL` (via Secret do Kubernetes ou `.env` local), nao provisiona nem gerencia o banco.
- **CI/CD** (`.github/workflows/pipeline.yml`) builda, testa, publica a imagem no GHCR e faz o deploy da nova versao no cluster (production a partir de `main`, staging a partir de `develop`) a cada push.

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

### 3. Banco de dados e iniciar API

Este repositório não sobe mais um Postgres local — aponte `DATABASE_URL`
(no `.env`) para um Postgres seu (local ou o RDS de dev/staging provisionado
em [`mecanica-db-infra-SOAT`](https://github.com/Castor-Garage/mecanica-db-infra-SOAT)).

```bash
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

## Rodar com Docker

```bash
docker compose up --build
```

Só sobe a API (usa a `DATABASE_URL` do `.env` — nenhum Postgres embutido).

## Deploy em Kubernetes

Este repositório **não provisiona infraestrutura** (cluster, banco) — só os
manifestos da própria API, aplicados contra recursos já existentes:

- Cluster EKS, node group, `metrics-server`, StorageClass: [`mecanica-k8s-infra-SOAT`](https://github.com/Castor-Garage/mecanica-k8s-infra-SOAT).
- RDS PostgreSQL: [`mecanica-db-infra-SOAT`](https://github.com/Castor-Garage/mecanica-db-infra-SOAT).
- Namespace, ConfigMap e Secret de cada ambiente (`castor-garage-production`/`castor-garage-staging`) são aplicados manualmente uma vez (não fazem parte do deploy automático — ver comentários em `pipeline.yml`).

O deploy em si (`kubectl apply -k`) roda pelo CI/CD a cada push, mas pode ser feito manualmente:

```bash
kubectl apply -f k8s/api/overlays/production/namespace.yaml
sed -i "s/newTag:.*/newTag: <sha-ou-tag-da-imagem>/" k8s/api/overlays/production/kustomization.yaml
kubectl apply -k k8s/api/overlays/production
```

### Estrutura dos manifestos (`/k8s`)

```
k8s/
├── api/
│   ├── base/               # Deployment, Service, HPA, ConfigMap (comuns)
│   └── overlays/
│       ├── production/     # Namespace castor-garage-production + patches
│       └── staging/        # Namespace castor-garage-staging + patches (replicas, HPA)
└── jobs/
    └── create-staging-db.yaml  # Job de bootstrap do database de staging
```

## CI/CD (`.github/workflows/pipeline.yml`)

Pipeline no GitHub Actions disparada em push/PR para `main`/`develop`:

1. **`test`** — instala dependencias, gera o Prisma Client, roda
   `typecheck`, testes unitarios e testes de integracao (com um servico
   `postgres:16-alpine` no runner).
2. **`build`** — builda a imagem Docker e publica em
   `ghcr.io/castor-garage/mecanica-pos-soat` (tags `<sha>` e `latest`/`develop-latest`).
3. **`deploy-production`** (push em `main`) / **`deploy-staging`** (push em
   `develop`) — autentica na AWS com as credenciais temporarias do Academy
   Learner Lab (secrets do GitHub), aponta o `kubectl` para o cluster EKS ja
   provisionado por `mecanica-k8s-infra-SOAT`, aplica `k8s/api/overlays/*`
   via Kustomize com a tag da imagem do commit, aguarda o rollout, descobre
   o hostname do Load Balancer, faz um smoke test em `/health`, verifica o
   `HorizontalPodAutoscaler` e publica a URL no SSM Parameter Store.

Esse job publica a nova versao a cada push num ambiente **persistente** na
AWS — o cluster fica no ar entre execucoes, pronto pra usar no video
demonstrativo (deploy, execucao do CI/CD, consumo das APIs, escalabilidade
automatica).

## Testes

```bash
# Unitarios (recomendado para CI/CD)
npm run test:unit

# Integracao + Unitarios (requer PostgreSQL rodando - sem Postgres embutido
# no docker-compose, use um seu ou aponte TEST_DATABASE_URL para um remoto)
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
- Repositorios relacionados (Fase 3): [`mecanica-auth-lambda-SOAT`](https://github.com/Castor-Garage/mecanica-auth-lambda-SOAT), [`mecanica-k8s-infra-SOAT`](https://github.com/Castor-Garage/mecanica-k8s-infra-SOAT), [`mecanica-db-infra-SOAT`](https://github.com/Castor-Garage/mecanica-db-infra-SOAT).

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
