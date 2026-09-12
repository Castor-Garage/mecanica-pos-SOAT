# RFC 0002 — Banco de dados gerenciado

- **Status**: Aceito
- **Autores**: Time Castor Garage
- **Relacionado a**: ADR 0004 (RDS vs banco em cluster), `docs/modelo-dominio.mmd`

## Contexto

A Fase 3 exige um "Banco de Dados Gerenciado (PostgreSQL, MySQL, SQL
Server, etc.)" no lugar do Postgres hoje rodando dentro do cluster
(`k8s/postgres/deployment.yaml`, um `Deployment` com PVC de 5Gi e
credenciais fixas em `k8s/secret.yaml`, commitadas em texto plano no git).

## Alternativas consideradas

| Opção | Prós | Contras |
|---|---|---|
| **PostgreSQL no Amazon RDS** (escolhida) | Mesma engine já usada — schema Prisma, migrations, `@prisma/adapter-pg` e queries continuam idênticos; risco de migração mínimo; RDS oferece backup automático, patching e Multi-AZ (não usado aqui por custo, mas disponível) | RDS na Academy exige contornar `publicly_accessible` para rodar a migração/seed inicial fora da VPC (ver ADR 0004) |
| MySQL / Aurora / SQL Server no RDS | Também gerenciado | Exigiria reescrever schema Prisma, migrations e testes de integração para outra engine, sem ganho técnico para este projeto |
| DynamoDB (NoSQL gerenciado) | Serverless, sem instância para gerenciar | O domínio é fortemente relacional (Cliente → Veículo → OS → Itens/Peças → Histórico de Status, com múltiplos joins e agregações para os dashboards) — modelar isso em NoSQL exigiria desnormalização extensa sem benefício |
| Manter Postgres em cluster (não gerenciado) | Zero migração | Não atende ao requisito obrigatório da Fase 3; sem backup automático; credenciais fixas commitadas continuariam sendo um problema real de segurança |

## Justificativa formal (ajustes no modelo relacional)

O modelo relacional atual (`prisma/schema.prisma`) já reflete os ajustes de
performance e consistência feitos ao longo da Fase 2/3:

- **`Client.status`** (`ATIVO`/`INATIVO`/`BLOQUEADO`) substitui o antigo
  booleano implícito de ativação — necessário para a Lambda de autenticação
  por CPF decidir se emite token (ver RFC 0003).
- **Índices de performance** (`ServiceOrder.status`, `ServiceOrder.createdAt`,
  `OSStatusHistory.[serviceOrderId, changedAt]`) foram adicionados
  especificamente para sustentar as consultas dos dashboards de
  observabilidade exigidos pela Fase 3 (volume diário por `createdAt`,
  listagem de OS ativas por `status`, tempo por status varrendo o
  histórico em ordem de `changedAt`) sem full table scan.
- **`OSStatusHistory`** é a tabela de auditoria que sustenta o cálculo de
  "tempo médio de execução por status" — sem ela, esse dado só existiria
  nos logs (voláteis, sem garantia de retenção), então ele também vive no
  banco relacional como fonte de verdade.
- Ver `docs/modelo-dominio.mmd` para o diagrama ER atualizado e
  `docs/linguagem-ubiqua.md` para as definições de cada campo/relacionamento.

## Decisão

PostgreSQL 16 no Amazon RDS (`db.t3.micro`, 20GB, single-AZ), provisionado
via Terraform em repositório próprio (`castor-garage-db-infra`), com
`DATABASE_URL` do endpoint publicado via AWS SSM Parameter Store para os
demais repositórios consumirem.

## Consequências

- Não há migração de dados de produção — a base de demonstração é
  recriada via `prisma migrate deploy` + `npm run db:seed` contra o RDS.
- `k8s/postgres/*.yaml` e o `null_resource.database` do Terraform atual
  são removidos.
- Acesso ao RDS fica restrito à VPC (ingress por CIDR da VPC default,
  documentado como simplificação aceitável em ADR 0004).
