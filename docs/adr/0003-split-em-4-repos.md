# ADR 0003 — Split do monorepo em 4 repositórios

- **Status**: Aceito

## Contexto

A Fase 3 exige 4 repositórios separados, cada um com CI/CD e deploy
automático próprio: (1) Lambda/Function Serverless, (2) infraestrutura
Kubernetes (Terraform), (3) infraestrutura do banco gerenciado (Terraform),
(4) aplicação principal em Kubernetes. Hoje tudo vive em um único repo
(`mecanica-pos-SOAT`), com um único pipeline (`.github/workflows/pipeline.yml`)
cuidando de teste, build e deploy da aplicação, e dois módulos Terraform
(`infra/` local e `infra/aws/`) para o cluster.

## Decisão

| Repositório | Conteúdo | Base |
|---|---|---|
| `castor-garage-auth-lambda` | Handlers da Lambda de auth por CPF + authorizer, Terraform do API Gateway/Lambda, CI/CD próprio | Novo (greenfield) |
| `castor-garage-k8s-infra` | Terraform do cluster EKS (portado de `infra/aws/`, sem o banco em cluster), manifests compartilhados (`namespace`, `configmap` base) | Portado de `infra/aws/` |
| `castor-garage-db-infra` | Terraform do RDS PostgreSQL | Novo (nenhum Terraform de banco gerenciado existia) |
| `mecanica-pos-SOAT` | Aplicação (Clean Architecture, testes, Prisma), manifests da API (`k8s/api/*`), CI/CD de teste/build/deploy | O repo atual, podado |

**O repo `mecanica-pos-SOAT` continua sendo o repositório 4**, em vez de
criar um quinto repo novo para a aplicação — evita reescrever/perder o
histórico de commits da Fase 1/2 e mantém a URL já usada em entregas
anteriores. Os repositórios 1–3 são criados vazios, sem tentativa de
preservar histórico (não havia código prévio relevante para eles).

## Alternativas consideradas

- **`git filter-repo`/subtree split preservando histórico em todos os 4** — rejeitado: `infra/aws/` e `k8s/postgres/*` não têm histórico rico o suficiente para justificar a complexidade de um filter-repo, e fazer isso no repo principal arriscaria corromper ou confundir o histórico já entregue na Fase 2.
- **5º repositório só de documentação** — rejeitado (ver também decisão de local dos docs): só 4 repos são avaliados: a documentação fica em `mecanica-pos-SOAT/docs/`, linkada pelos outros 3.

## Consequências

- `infra/aws/*` só é removido de `mecanica-pos-SOAT` depois que o primeiro
  `terraform apply` do novo `castor-garage-k8s-infra` funcionar — mantém
  caminho de rollback durante a transição.
- Mudanças que cruzam fronteira de repositório (ex.: alterar a query que a
  Lambda faz no banco) exigem coordenar PRs em repos diferentes — aceitável
  para o volume de mudanças esperado no projeto.
- Configuração compartilhada entre repos (segredo JWT, endpoint do banco)
  não pode mais viver em um `.env`/`secret.yaml` único — motivou o uso do
  SSM Parameter Store como contrato entre repositórios.
