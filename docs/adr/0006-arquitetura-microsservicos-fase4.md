# ADR 0006 — Arquitetura de microsserviços e Saga Pattern (Fase 4)

- **Status**: Aceito
- **Supersede**: ADR 0001 (padrão de comunicação)

## Contexto

A Fase 4 exige refatorar a aplicação única (`mecanica-pos-SOAT`) para um
modelo distribuído: no mínimo 3 microsserviços independentes, cada um com
repositório, infraestrutura e banco próprios, com consistência
transacional entre as etapas críticas (abertura de OS, aprovação de
orçamento, pagamento, execução) garantida por um Saga Pattern com
rollback/compensação.

Hoje (Fase 3) a comunicação entre componentes é toda síncrona via HTTP
(ADR 0001) e o fluxo de OS → orçamento → aprovação → execução acontece
inteiro dentro de um único processo e uma única transação de banco
(`CreateServiceOrderUseCase`, `ApproveQuoteUseCase`, máquina de estados
`OSStatus`). Não existe hoje conceito de pagamento/cobrança nem de fila
de execução como serviço separado.

## Decisão

### Separação em 3 microsserviços

| Serviço | Repositório | Responsabilidade | Banco |
|---|---|---|---|
| **OS Service** | `mecanica-pos-SOAT` (este repo, podado) | Abertura/consulta/status/histórico de OS, cadastro (cliente/veículo), catálogo (serviço/peça), admin/auth, e **orquestração da saga** | PostgreSQL (mantém o atual) |
| **Billing Service** | `mecanica-billing-SOAT` (novo) | Geração de orçamento, aprovação, registro e verificação de pagamento, integração com Mercado Pago | PostgreSQL (orçamento/pagamento) + MongoDB/DynamoDB (webhooks e tentativas de pagamento) |
| **Execução/Produção Service** | `mecanica-execucao-SOAT` (novo) | Fila de execução da OS, status de diagnóstico/reparo, aviso de finalização | PostgreSQL |

O OS Service continua sendo a única fachada HTTP pública para
cliente/front-end e admin; Billing e Execução não expõem API pública,
apenas consomem/publicam mensagens (exceto o webhook do Mercado Pago, que
chega direto no Billing Service).

### Comunicação: mensageria assíncrona via Amazon SQS

Substitui, para o fluxo transacional da OS, o modelo 100% síncrono do
ADR 0001 (que permanece válido apenas para: cliente → API Gateway →
Lambda de auth, e para consultas pontuais do front-end ao OS Service).

Três filas:

- **`billing-commands`** (OS Service → Billing Service): comando
  `GerarOrcamento`.
- **`execucao-commands`** (OS Service → Execução Service): comando
  `IniciarExecucao`.
- **`os-events`** (Billing/Execução → OS Service, fan-in): eventos
  `OrcamentoGerado`, `PagamentoConfirmado`, `PagamentoFalhou`,
  `ExecucaoFinalizada`, `ExecucaoFalhou`.

Nenhum serviço acessa diretamente o banco de outro — toda troca de
estado entre serviços passa por essas filas.

### Saga Pattern: orquestrada no OS Service

Escolhido o modelo **orquestrado** em vez de coreografado: o OS Service
já é hoje o dono do agregado `ServiceOrder` e da máquina de estados
`OSStatus` (`src/domain/service-order/value-objects/OSStatus.ts`), então
centralizar nele a lógica de avançar/compensar a saga evita espalhar
regras de compensação pelos 3 serviços e é mais simples de implementar e
testar no prazo da fase.

Fluxo:

```
RECEBIDA
  → (OS Service publica GerarOrcamento em billing-commands)
  → (Billing consome, calcula orçamento, publica OrcamentoGerado em os-events)
EM_DIAGNOSTICO / AGUARDANDO_APROVACAO
  → cliente aprova orçamento (API síncrona do OS Service)
  → (OS Service aciona cobrança; Billing processa pagamento via Mercado Pago)
  → (Billing publica PagamentoConfirmado ou PagamentoFalhou em os-events)
  → se confirmado: OS Service publica IniciarExecucao em execucao-commands
  → se falhou: compensação (ver abaixo)
EM_EXECUCAO
  → (Execução consome IniciarExecucao, processa, publica ExecucaoFinalizada/ExecucaoFalhou em os-events)
FINALIZADA / ENTREGUE
```

**Compensação**: se `PagamentoFalhou` ou `ExecucaoFalhou` chegar em
`os-events`, o OS Service reverte a OS para um status de
cancelamento/retrabalho (sem avançar para o próximo estado) e, quando
aplicável, publica um comando de estorno para o Billing Service. Não há
rollback de banco distribuído (2PC) — cada etapa já concluída permanece
registrada em seu serviço de origem; a compensação é lógica, no nível de
negócio (ex.: orçamento gerado continua existindo no Billing mesmo que a
OS seja cancelada depois).

## Alternativas consideradas

- **Saga coreografada (eventos entre os 3 serviços, sem orquestrador)** —
  rejeitada para este prazo: exigiria que Billing e Execução também
  conhecessem regras de compensação da OS, duplicando lógica que hoje já
  vive centralizada em `OSStatus`.
- **RabbitMQ/Kafka auto-hospedados** — rejeitados: exigiriam provisionar e
  operar um broker no cluster EKS (Academy) sob prazo curto; SQS gerenciado
  reaproveita a mesma conta AWS já usada para RDS/EKS.
- **Manter tudo síncrono (HTTP) entre os 3 serviços** — rejeitada: não
  atende ao requisito obrigatório de mensageria assíncrona e reintroduziria
  acoplamento temporal forte entre etapas de naturezas distintas (cálculo
  de orçamento, cobrança externa, execução física).

## Consequências

- ADR 0001 deixa de ser a decisão de comunicação *completa* do sistema:
  continua valendo para auth (Lambda) e para chamadas síncronas
  cliente/front → OS Service, mas o fluxo interno da saga passa a ser
  assíncrono via SQS.
- Observabilidade de correlação (`requestId`) precisa passar a propagar
  também nos atributos da mensagem SQS, não só em headers HTTP, para
  manter o rastreamento ponta a ponta entre os 3 serviços (ver
  `docs/observabilidade.md`).
- Falha ou atraso em Billing/Execução não derruba o OS Service — a OS
  fica visivelmente "presa" num status intermediário até a mensagem ser
  processada ou expirar (DLQ), o que precisa de alerta dedicado.
- Provisionamento das filas SQS fica no `mecanica-k8s-infra-SOAT` (ver
  RFC 0004), não num repositório novo só para mensageria.
