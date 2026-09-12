# ADR 0002 — Uso do HorizontalPodAutoscaler (HPA)

- **Status**: Aceito (herdado da Fase 2, mantido na Fase 3)

## Contexto

A Fase 3 exige "Cluster Kubernetes com escalabilidade". Desde a Fase 2 o
Deployment `castor-garage-api` já roda com um `HorizontalPodAutoscaler`
(`k8s/api/hpa.yaml`, API `autoscaling/v2`) e o `metrics-server` provisionado
via Terraform (necessário para o HPA ler uso de CPU/memória).

## Decisão

Manter o HPA como mecanismo de escalabilidade horizontal da aplicação:

- `minReplicas: 2`, `maxReplicas: 10`.
- Escala por CPU (>70%) e memória (>80%) — o que vier primeiro dispara o scale-out.
- `metrics-server` continua sendo provisionado pelo Terraform do cluster (repo 2), pré-requisito técnico do HPA.

Isso é reaproveitado sem alteração na Fase 3; a única mudança é onde o HPA
é declarado (passa a ficar sob `k8s/api/base/` como parte dos overlays
kustomize de staging/produção, ver ADR 0005).

## Alternativas consideradas

- **Vertical Pod Autoscaler (VPA)** — rejeitado: reinicia pods para redimensionar recursos, o que não serve bem para uma API stateless que precisa responder a picos de tráfego em tempo real; HPA é o mecanismo correto para esse padrão de carga.
- **Escala manual (`kubectl scale`)** — rejeitado: não atende ao requisito de "escalabilidade" automática nem sustenta o cenário de "múltiplas unidades e aumento constante na base de clientes" descrito no desafio.
- **KEDA (autoscaling orientado a eventos)** — considerado e descartado por falta de fonte de evento assíncrona no sistema (ver ADR 0001) que justificasse escalar por filas em vez de CPU/memória.

## Consequências

- CPU/memória do HPA é exatamente um dos itens monitorados na Fase 3
  (New Relic Infrastructure/K8s integration, ver `docs/observabilidade.md`
  e o RFC de observabilidade) — o mesmo dado que decide o scale-out também
  alimenta o dashboard de "consumo de recursos do Kubernetes".
- `resources.requests`/`limits` do Deployment (`250m/256Mi` a `500m/512Mi`)
  continuam sendo o baseline usado pelo HPA para calcular percentuais —
  qualquer mudança de carga esperada deve revisar esses valores junto.
