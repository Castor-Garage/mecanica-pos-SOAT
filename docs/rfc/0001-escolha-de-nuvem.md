# RFC 0001 — Escolha do provedor de nuvem

- **Status**: Aceito
- **Autores**: Time Castor Garage
- **Relacionado a**: ADR 0003 (split em 4 repositórios), ADR 0004 (RDS vs banco em cluster)

## Contexto

O Tech Challenge Fase 3 exige "livre escolha de nuvem" para hospedar API
Gateway, Function Serverless, banco de dados gerenciado e cluster
Kubernetes com IaC via Terraform. A Fase 2 já entregou um cluster EKS na
**AWS Academy Learner Lab** (`infra/aws/`), reaproveitando a role padrão da
Academy (`LabRole`) para contornar a restrição de não poder criar IAM roles
novas na conta.

## Alternativas consideradas

| Opção | Prós | Contras |
|---|---|---|
| **AWS Academy Learner Lab** (escolhida) | Já em uso desde a Fase 2 (EKS, GHCR, pipeline); zero custo (crédito da Academy); equipe já resolveu o workaround do `LabRole` e das tags de subnet para o LoadBalancer | Sessão de credenciais expira em poucas horas; impossível criar IAM roles novas (toda role reaproveita `LabRole`); serviços/limites variam conforme a config do curso |
| Conta AWS pessoal (Free Tier) | Sem as restrições de IAM da Academy | Custo real se algo escapar do Free Tier; nenhuma infraestrutura já provisionada, exigiria refazer o EKS do zero |
| GCP / Azure com crédito educacional | Também gratuito | Migração completa do que já existe (EKS → GKE/AKS, sem histórico de troubleshooting); nenhum ganho de nota por trocar de nuvem |

## Decisão

Manter **AWS Academy Learner Lab**, dando continuidade à infraestrutura já
provisionada na Fase 2. Todos os novos recursos (Lambda, API Gateway, RDS)
reaproveitam o mesmo `LabRole` e a mesma VPC default já em uso pelo EKS.

## Consequências

- Toda automação (Terraform, CI/CD) deve assumir credenciais de sessão
  temporárias — cada repo precisa ter os secrets do GitHub Actions
  atualizados antes de rodar `terraform apply` ou o job de deploy, sempre
  que a sessão do Lab for reiniciada.
- Nenhum recurso pode depender de criar uma IAM role dedicada — API
  Gateway, Lambda, EKS e RDS reaproveitam permissões existentes do
  `LabRole` (documentado explicitamente na Terraform de cada repo).
- Primeiro `apply` de recursos lentos (EKS, RDS) deve rodar manualmente,
  fora do CI, para não perder a operação no meio por expiração de sessão
  (ver seção de sequenciamento no plano de implementação).
