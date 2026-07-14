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
  Client["Cliente / Front-end"] -->|HTTP :30080| Svc

  subgraph API["Arquitetura de codigo (Clean Architecture)"]
    Routes["Routes"] --> UseCases["Use Cases"]
    UseCases --> Domain["Domain"]
    UseCases --> Repos["Prisma Repositories"]
  end

  API -. roda dentro de .-> Deploy

  subgraph K8s["Kubernetes (kind - cluster local)"]
    direction TB
    CM["ConfigMap"] --> Deploy
    Secret["Secret"] --> Deploy
    HPA["HorizontalPodAutoscaler"] -. escala .-> Deploy["Deployment castor-garage-api (2-10 replicas)"]
    Svc["Service NodePort :30080"] --> Deploy
    Deploy --> PgSvc["Service postgres :5432"] --> PgDeploy["Deployment postgres"]
  end

  subgraph TF["Terraform (/infra)"]
    T1["kind create cluster"] --> T2["instala metrics-server"] --> T3["aplica namespace/configmap/secret/postgres"]
  end

  T3 -. provisiona .-> K8s

  subgraph CICD["CI/CD (GitHub Actions)"]
    direction LR
    J1["test"] --> J2["build"] --> J3["deploy"]
  end

  J3 -. publica nova imagem .-> Deploy
```

- **Terraform** (`/infra`) provisiona o cluster kind, o `metrics-server` (necessario para o HPA) e o banco de dados (namespace + configmap + secret + Postgres), reaproveitando os manifestos de `/k8s` como fonte unica de verdade.
- **Kubernetes** (`/k8s`) mantem a API rodando com auto-scaling (HPA por CPU/memoria) e configuracao via ConfigMap/Secret.
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

Scripts Terraform para provisionar, localmente, o cluster Kubernetes (kind), o
`metrics-server` (para o HPA funcionar) e o banco de dados. Pre-requisitos:
Docker, [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation),
`kubectl` e [Terraform](https://developer.hashicorp.com/terraform/install)
>= 1.5.

```bash
cd infra
terraform init
terraform apply
```

Isso cria o cluster `castor-garage`, instala o `metrics-server` e aplica
`k8s/namespace.yaml`, `k8s/configmap.yaml`, `k8s/secret.yaml` e
`k8s/postgres/*.yaml`. Depois, publique a API (isso **nao** e feito pelo
Terraform de proposito — fica a cargo do `kubectl apply` manual ou do job
`deploy` do CI/CD, ver abaixo):

```bash
kubectl apply -f k8s/api/
```

Para destruir tudo (namespace + cluster kind):

```bash
cd infra
terraform destroy
```

Detalhes de cada recurso em [`infra/README.md`](infra/README.md).

### Track de produção (`/infra/aws`)

Este projeto tem dois tracks de infraestrutura:

- **`infra/`** (acima) — cluster kind local, provisionado automaticamente pelo CI/CD a cada push/PR.
  Usado para desenvolvimento e demonstração.
- **`infra/aws/`** — VPC + EKS + RDS PostgreSQL na AWS, para um ambiente de produção real. Provisionado
  manualmente (não roda a cada push). Deploy da aplicação feito pelo workflow manual
  `.github/workflows/deploy-production.yml` (aba Actions → Run workflow), contra os manifestos em
  `k8s/aws/`. Pré-requisitos, variáveis e os secrets do GitHub necessários estão documentados em
  [`infra/aws/README.md`](infra/aws/README.md).

## CI/CD (`.github/workflows/pipeline.yml`)

Pipeline no GitHub Actions com 3 jobs encadeados, disparada em push/PR para
`main`:

1. **`test`** — instala dependencias, gera o Prisma Client, roda
   `typecheck`, testes unitarios e testes de integracao (com um servico
   `postgres:16-alpine` no runner).
2. **`build`** — builda a imagem Docker e publica em
   `ghcr.io/castor-garage/mecanica-pos-soat` (tags `latest` e `<sha>`).
3. **`deploy`** (so em push para `main`) — instala `kind` e roda
   `terraform apply` em `/infra` para subir um cluster efemero + banco de
   dados no proprio runner, carrega a imagem recem-publicada com
   `kind load docker-image`, aplica `k8s/api/`, aguarda o rollout, faz um
   smoke test em `/health` e verifica o `HorizontalPodAutoscaler`. Ao final
   (mesmo se algo falhar), roda `terraform destroy` para limpar o runner.

Esse job de deploy existe para provar, a cada push, que a imagem publicada
sobe de verdade em um cluster Kubernetes com banco de dados provisionado por
Terraform. Para manter um ambiente **persistente** para demonstracao (video,
uso manual), rode os mesmos passos localmente (secao acima) em vez de
depender do cluster efemero do CI.

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
- `GET /service-orders/:id` — publico (cliente acompanha)
- `GET /service-orders/track/:orderNumber` — consulta publica por numero da OS
- `POST /service-orders` — abertura de OS
- `POST /service-orders/:id/approve` — aprovar orcamento (autenticado)
- `POST /service-orders/:id/reject` — rejeitar orcamento (autenticado)
- `POST /service-orders/:id/advance` — avancar status
- `POST /service-orders/:id/send-email` — publico; envia os dados da OS para um e-mail informado na hora (nao persistido)
- `POST /service-orders/track/:orderNumber/approve` — publico; cliente aprova o orcamento pela tela de acompanhamento
- `POST /service-orders/track/:orderNumber/reject` — publico; cliente rejeita o orcamento pela tela de acompanhamento
- `GET /service-orders/stats` — estatisticas de servicos

### Webhook
- `POST /webhooks/email` — atualizacao de status via e-mail

### Utilitarios
- `GET /health`
- `GET /docs` — Swagger UI
