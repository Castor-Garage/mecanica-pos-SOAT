# Castor Garage API

Backend para gestão completa de oficina mecânica com controle de clientes, veículos, serviços, peças e ordens de serviço.

Projeto desenvolvido para a turma 2026 de **SOAT - FIAP** — **Fase 2: Infraestrutura Escalável**.

## Membros do Time

| Nome | RM | Discord |
|------|----|---------|
| Carlos Henrique Furtado | 371256 | kmzsonequinha |
| Luiz Otávio Leitão | 370255 | _louizzz |
| Vitor Cruz dos Santos | 371411 | vsacz |

---

## Objetivos da Fase 2

Evoluir a aplicação da Fase 1 para garantir qualidade, resiliência e escalabilidade:

- Infraestrutura escalável com Kubernetes e auto-scaling (HPA)
- Provisionamento automatizado via Terraform (AWS EKS + RDS)
- CI/CD completo com GitHub Actions — testes, build, push e deploy automático
- Containerização com Docker multi-stage otimizado

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions CI/CD                      │
│  push → test → build → push (ghcr.io) → deploy (EKS)           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  AWS EKS       │
                    │  Namespace:    │
                    │  mecanica      │
                    │                │
                    │  ┌──────────┐  │
                    │  │  HPA     │  │  min 2 / max 5 pods
                    │  │ CPU >70% │  │  CPU ou Memória >80%
                    │  └────┬─────┘  │
                    │       │        │
                    │  ┌────▼──────┐ │
                    │  │Deployment │ │  2 réplicas
                    │  │mecanica-  │ │  node:20-alpine
                    │  │api        │ │  liveness /health
                    │  └────┬──────┘ │
                    │       │        │
                    │  ┌────▼──────┐ │
                    │  │ Service   │ │  ClusterIP :3000
                    │  │ Ingress   │ │  /api → nginx
                    │  └───────────┘ │
                    │                │
                    │  ┌──────────┐  │
                    │  │ConfigMap │  │  NODE_ENV, PORT, HOST
                    │  │Secret    │  │  JWT_SECRET, DATABASE_URL
                    │  └──────────┘  │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  AWS RDS       │
                    │  PostgreSQL 16 │  db.t3.micro, single-AZ
                    │  subnet privada│  SG restrito ao EKS
                    └────────────────┘

┌──────────────────────────────────────────┐
│  Terraform — /infra                       │
│  VPC (10.0.0.0/16, 2 AZs)               │
│  ├── Public subnets  (NAT Gateway)       │
│  ├── Private subnets (EKS nodes + RDS)  │
│  ├── EKS 1.30 — t3.medium min2/max4     │
│  └── RDS PostgreSQL 16 — db.t3.micro    │
└──────────────────────────────────────────┘
```

### Fluxo de deploy

```
push main
  └─ test          → npm ci + typecheck + vitest
  └─ build         → docker build (valida imagem)
  └─ push          → ghcr.io/castor-garage/mecanica-pos-soat:latest + :sha
  └─ deploy        → aws eks update-kubeconfig
                   → kubectl apply -f k8s/namespace.yaml
                   → kubectl apply -f k8s/postgres/
                   → kubectl apply -f k8s/
                   → kubectl set image deployment/mecanica-api api=...:sha
                   → kubectl rollout status
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20 + TypeScript |
| Framework | Fastify 5 |
| ORM | Prisma 7 + PostgreSQL 16 |
| Testes | Vitest (142 testes unitários) |
| Container | Docker multi-stage (node:20-alpine) |
| Orquestração | Kubernetes (EKS / minikube) |
| IaC | Terraform (AWS VPC + EKS + RDS) |
| CI/CD | GitHub Actions |
| Registry | GitHub Container Registry (ghcr.io) |
| Documentação | Swagger/OpenAPI em `/documentation` |

---

## Arquitetura da Aplicação (Clean Architecture)

```
src/
├── application/        # Use Cases — lógica de negócio
│   └── use-cases/
│       ├── auth/
│       ├── client/
│       ├── part/
│       ├── service/
│       ├── vehicle/
│       └── service-order/
├── domain/             # Entidades e regras de domínio
│   ├── admin/
│   ├── client/
│   ├── part/
│   ├── service/
│   ├── vehicle/
│   └── service-order/
├── infrastructure/     # Implementações técnicas
│   ├── database/       # Prisma repositories
│   └── http/           # Fastify routes & server
└── shared/             # Código compartilhado
    ├── errors/
    └── types/
```

---

## Execução local

### Pré-requisitos
- Docker + Docker Compose
- Node.js 20 (apenas para desenvolvimento sem Docker)

### Com Docker Compose (recomendado)

```bash
# Copiar e configurar variáveis de ambiente
cp .env.example .env

# Subir API + PostgreSQL
docker compose up --build

# API disponível em:
# http://localhost:3000/health
# http://localhost:3000/documentation
```

### Sem Docker (desenvolvimento)

```bash
npm install

# Subir apenas o banco
docker compose up -d db

# Rodar migrações e iniciar
npx prisma generate
npm run db:migrate
npm run dev
```

Credenciais padrão: `admin@oficina.com` / `Admin@123`

---

## Deploy em Kubernetes

### Pré-requisitos
- `kubectl` configurado (minikube ou EKS)
- Imagem disponível no registry

### Configurar secrets antes de aplicar

```bash
# Gerar valores base64
echo -n 'seu-jwt-secret' | base64
echo -n 'postgresql://user:pass@host:5432/mecanica_db' | base64
```

Editar `k8s/secret.yaml` com os valores gerados.

### Aplicar manifests

```bash
# Namespace primeiro
kubectl apply -f k8s/namespace.yaml

# Banco de dados (StatefulSet PostgreSQL — uso local/minikube)
kubectl apply -f k8s/postgres/

# Aplicação
kubectl apply -f k8s/

# Verificar pods
kubectl get pods -n mecanica

# Testar via port-forward
kubectl port-forward svc/mecanica-api 3000:3000 -n mecanica
curl http://localhost:3000/health
```

> Em produção (EKS), o `DATABASE_URL` no `k8s/secret.yaml` deve apontar para o endpoint do RDS.

---

## Provisionamento com Terraform (AWS)

### Pré-requisitos
- Terraform >= 1.6
- AWS CLI configurado (`aws configure`)
- Bucket S3 para o state

### Recursos provisionados

| Recurso | Configuração |
|---------|-------------|
| VPC | 10.0.0.0/16, 2 AZs, NAT Gateway |
| EKS | v1.30, node group t3.medium (min 2 / max 4) |
| RDS | PostgreSQL 16, db.t3.micro, single-AZ |

### Aplicar

```bash
cd infra

terraform init \
  -backend-config="bucket=SEU-BUCKET-STATE" \
  -backend-config="key=mecanica/terraform.tfstate" \
  -backend-config="region=us-east-1"

terraform plan -var="db_password=SuaSenha"
terraform apply -var="db_password=SuaSenha"

# Configurar kubectl após apply
aws eks update-kubeconfig --region us-east-1 --name mecanica-eks
```

Consulte `/infra/README.md` para instruções detalhadas.

---

## CI/CD — GitHub Actions

### Secrets necessários no repositório

| Secret | Descrição |
|--------|-----------|
| `AWS_ACCESS_KEY_ID` | Credencial AWS |
| `AWS_SECRET_ACCESS_KEY` | Credencial AWS |
| `AWS_REGION` | Ex: `us-east-1` |
| `EKS_CLUSTER_NAME` | Nome do cluster (output do Terraform) |

> `GITHUB_TOKEN` é fornecido automaticamente pelo GitHub Actions.

### Jobs

| Job | Trigger | O que faz |
|-----|---------|-----------|
| `test` | push + PR | typecheck + 142 testes unitários |
| `build` | após test | build da imagem Docker |
| `push` | push main | push para ghcr.io com tags `latest` e `sha` |
| `deploy` | após push | aplica manifests K8s + rolling update no EKS |

---

## APIs

Documentação interativa disponível em: `http://localhost:3000/documentation`

### Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login admin (retorna JWT) |
| GET | `/clients` | Listar clientes |
| POST | `/clients` | Criar cliente |
| GET | `/vehicles` | Listar veículos |
| POST | `/vehicles` | Criar veículo |
| GET | `/services` | Listar serviços |
| GET | `/parts` | Listar peças |
| POST | `/service-orders` | Abrir OS |
| GET | `/service-orders` | Listar OS (ordenadas por prioridade de status) |
| GET | `/service-orders/:id` | Consultar status da OS |
| PATCH | `/service-orders/:id/approve` | Aprovar orçamento |
| PATCH | `/service-orders/:id/reject` | Rejeitar orçamento |
| PATCH | `/service-orders/:id/advance` | Avançar status |
| POST | `/service-orders/webhook/status` | Atualização de status via email |
| GET | `/health` | Health check |

---

## Testes

```bash
# Unitários (142 testes)
npm test

# Com cobertura
npm run test:coverage

# Integração (requer PostgreSQL rodando)
npm run test:all
```

---

## Vídeo demonstrativo

> Link: _a ser adicionado após gravação_

---

## Entrega

Repositório compartilhado com o usuário **`soat-architecture`** no GitHub.
