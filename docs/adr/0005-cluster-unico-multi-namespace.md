# ADR 0005 — Um cluster EKS, dois namespaces (staging/produção)

- **Status**: Aceito

## Contexto

A Fase 3 exige "deploy automático das branches de homologação e produção".
O cluster EKS atual (`infra/aws/`, Fase 2) já é lento para provisionar do
zero — 15 a 25 minutos, segundo o próprio `infra/aws/README.md` — e é essa
a razão pela qual o cluster já não é recriado a cada push, ficando no ar
entre execuções.

## Decisão

Um único cluster EKS, com dois namespaces Kubernetes:
`castor-garage-staging` e `castor-garage-production`. A separação de
ambiente é feita via **overlays kustomize** (`k8s/api/overlays/staging`,
`k8s/api/overlays/production`) sobre uma base comum (`k8s/api/base/`),
cada overlay fixando o namespace e a tag de imagem correspondente.
`push` na branch `develop` aplica o overlay de staging; `push` em `main`
aplica o de produção.

## Alternativas consideradas

- **Dois clusters EKS separados (um por ambiente)** — rejeitado: dobraria o tempo/custo de provisionamento (mais 15-25min) e o consumo de recursos limitados do Learner Lab, sem ganho de isolamento relevante para o escopo de um projeto acadêmico de demonstração.
- **Um único ambiente (sem staging)** — rejeitado: não atende ao requisito explícito de "deploy automático das branches de homologação e produção".

## Consequências

- Isolamento entre staging e produção é lógico (namespace + RBAC do K8s),
  não físico — um erro de configuração no overlay poderia, em teoria,
  vazar entre namespaces; aceitável dado que ambos os ambientes servem
  dados de demonstração, não produção real de clientes.
- HPA (ADR 0002), ConfigMap e Secret precisam existir em ambos os
  namespaces — os overlays kustomize garantem que cada um receba sua
  própria cópia parametrizada em vez de compartilhar recursos.
- RDS (ADR 0004) é compartilhado entre os dois ambientes nesta fase (um
  único banco, sem banco de staging separado) — simplificação aceita pelo
  mesmo motivo de custo/tempo; registrar como limitação conhecida caso o
  projeto evolua além do escopo acadêmico.
