# ADR 0006 — Arquitetura de microsserviços e Saga Pattern (Fase 4)

- **Status**: Aceito (decisão) / Implementado (orquestração no OS Service)
- **Supersede**: ADR 0001 (padrão de comunicação)

## Contexto

A Fase 4 exige refatorar a aplicação única (`mecanica-pos-SOAT`) para um
modelo distribuído: no mínimo 3 microsserviços independentes, cada um com
repositório, infraestrutura e banco próprios, com consistência
transacional entre as etapas críticas (abertura de OS, aprovação de
orçamento, pagamento, execução) garantida por um Saga Pattern com
rollback/compensação.

Antes da Fase 4, a comunicação entre componentes era toda síncrona via
HTTP (ADR 0001) e o fluxo de OS → orçamento → aprovação → execução
acontecia inteiro dentro de um único processo e uma única transação de
banco (`CreateServiceOrderUseCase`, `ApproveQuoteUseCase`, máquina de
estados `OSStatus`). Não existia conceito de pagamento/cobrança nem de
fila de execução como serviço separado.

## Decisão

### Separação em 3 microsserviços

| Serviço | Repositório | Responsabilidade | Banco |
|---|---|---|---|
| **OS Service** | `mecanica-pos-SOAT` (este repo, podado) | Abertura/consulta/status/histórico de OS, cadastro (cliente/veículo), catálogo (serviço/peça), admin/auth, e **orquestração da saga** | PostgreSQL (mantém o atual) |
| **Billing Service** | `mecanica-billing-SOAT` | Geração de orçamento, aprovação, registro e verificação de pagamento, integração com Mercado Pago | PostgreSQL (orçamento/pagamento) + DynamoDB (webhooks e tentativas de pagamento — ver RFC 0004) |
| **Execução/Produção Service** | `mecanica-execucao-SOAT` | Fila de execução da OS, status de diagnóstico/reparo, aviso de finalização | PostgreSQL |

O OS Service continua sendo a única fachada HTTP pública para
cliente/front-end e admin; Billing e Execução não expõem API pública,
apenas consomem/publicam mensagens (exceto o webhook do Mercado Pago, que
chega direto no Billing Service).

### Comunicação: mensageria assíncrona via Amazon SQS

Substitui, para o fluxo transacional da OS, o modelo 100% síncrono do
ADR 0001 (que permanece válido apenas para: cliente → API Gateway →
Lambda de auth, e para consultas pontuais do front-end ao OS Service).

Três filas, com o contrato espelhado em `src/domain/shared/messaging/topics.ts`
em cada um dos 3 repositórios (ainda não há um pacote npm compartilhado):

- **`billing-commands`** (OS Service → Billing Service): `GerarOrcamento`,
  `AprovarOrcamento`, `RejeitarOrcamento`.
- **`execucao-commands`** (OS Service → Execução Service): `IniciarExecucao`
  (também previstos `AvancarExecucao`/`FalharExecucao`, para uso futuro do
  próprio Execução Service).
- **`os-events`** (Billing/Execução → OS Service, fan-in): `OrcamentoGerado`,
  `OrcamentoRejeitado`, `PagamentoPendente`, `PagamentoConfirmado`,
  `PagamentoFalhou`, `ExecucaoFinalizada`, `ExecucaoFalhou`.

Nenhum serviço acessa diretamente o banco de outro — toda troca de estado
entre serviços passa por essas filas.

Cada serviço implementa a porta `IMessageBus` com dois adapters:
`InMemoryMessageBus` (testes/dev, só funciona dentro do próprio processo)
e `SqsMessageBus` (produção, long polling real via `@aws-sdk/client-sqs`).
A escolha é feita em `bus.ts` pela variável `MESSAGE_BUS_DRIVER=sqs`; sem
ela, usa o adapter em memória. `SqsMessageBus` aceita `SQS_ENDPOINT` para
apontar para qualquer endpoint compatível com SQS (ex. LocalStack), o que
permite rodar a saga real localmente sem depender da conta AWS Academy —
ver [`docs/demo-local-saga.md`](../demo-local-saga.md).

### Saga Pattern: orquestrada no OS Service

Escolhido o modelo **orquestrado** em vez de coreografado: o OS Service já
é o dono do agregado `ServiceOrder` e da máquina de estados `OSStatus`
(`src/domain/service-order/value-objects/OSStatus.ts`), então centralizar
nele a lógica de avançar/compensar a saga evita espalhar regras de
compensação pelos 3 serviços. `src/infrastructure/messaging/sagaConsumer.ts`
consome `os-events` e decide a próxima transição/comando — Billing e
Execução nunca decidem o status da OS, só publicam fatos sobre o que
aconteceu do lado deles.

Fluxo feliz, como implementado:

```
OS criada (RECEBIDA)
  → publica GerarOrcamento (billing-commands)
  → Billing publica OrcamentoGerado (os-events)
  → OS guarda billingQuoteId
  ... (diagnóstico, avanço manual até AGUARDANDO_APROVACAO)
  → cliente aprova (endpoint local) → publica AprovarOrcamento (billing-commands)
  → Billing cria a cobrança no Mercado Pago, publica PagamentoPendente (os-events)
  → OS guarda checkoutUrl/billingPaymentId
  → cliente paga → webhook do Mercado Pago → Billing publica PagamentoConfirmado (os-events)
  → OS publica IniciarExecucao (execucao-commands)
  → Execução processa (diagnóstico/execução, gerido no próprio serviço)
  → Execução publica ExecucaoFinalizada (os-events)
  → OS avança para FINALIZADA
```

**Compensação**: se `PagamentoFalhou` ou `ExecucaoFalhou` chegar em
`os-events`, o `sagaConsumer.ts` cancela a OS (novo status `OSStatus.CANCELADA`,
terminal) em vez de deixá-la presa no fluxo. Essa transição só é acionada
pelo orquestrador — os endpoints manuais (`/approve`, `/reject`,
`/advance`) nunca levam uma OS a `CANCELADA`. Não há rollback de banco
distribuído (2PC): cada etapa já concluída permanece registrada em seu
serviço de origem (ex.: orçamento gerado continua existindo no Billing
mesmo que a OS seja cancelada depois); a compensação é lógica, no nível de
negócio.

### Convivência com o fluxo local existente

O OS Service **continua calculando e aprovando o orçamento localmente**
(como antes da Fase 4) — o catálogo já é resolvido no próprio OS Service
ao criar a OS, então o `quoteTotalAmount` local existe desde a criação,
sem depender de rede. Isso é mantido por dois motivos: (1) não quebrar o
contrato já usado pelo front-end e pelos testes existentes; (2) permitir
que a operação básica da oficina funcione mesmo se o Billing Service
estiver fora do ar. Em paralelo, o mesmo comando `GerarOrcamento` é
publicado para o Billing Service, que calcula seu **próprio** orçamento
(`Quote`) de forma independente — os dois valores devem coincidir, já que
usam o mesmo catálogo. É o `Quote` do Billing que vira a cobrança real no
Mercado Pago. Aprovar/rejeitar localmente aciona o comando equivalente no
Billing. Fica registrado como dívida técnica unificar os dois caminhos
numa fase futura.

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
  acoplamento temporal forte entre etapas de naturezas distintas.
- **Remover completamente o cálculo local de orçamento do OS Service** —
  avaliada, mas descartada por ora (ver "Convivência" acima) dado o prazo.

## Consequências

- ADR 0001 deixa de ser a decisão de comunicação *completa* do sistema:
  continua valendo para auth (Lambda) e chamadas síncronas cliente/front →
  OS Service; o fluxo interno da saga é assíncrono via SQS.
- Observabilidade de correlação (`requestId`) precisaria propagar também
  nos atributos da mensagem SQS, não só em headers HTTP, para manter o
  rastreamento ponta a ponta entre os 3 serviços — ainda não implementado,
  registrado como próximo passo.
- Falha ou atraso em Billing/Execução não derruba o OS Service — a OS fica
  visivelmente "presa" num status intermediário até a mensagem ser
  processada ou expirar (DLQ), o que precisa de alerta dedicado.
- Provisionamento das filas SQS fica no `mecanica-k8s-infra-SOAT`, não num
  repositório novo só para mensageria.
- `OSStatus` ganhou o estado `CANCELADA` e `ServiceOrder` ganhou 4 colunas
  novas (`billingQuoteId`, `billingPaymentId`, `checkoutUrl`,
  `paymentConfirmedAt`), preenchidas só pelo `sagaConsumer.ts`.
- Testado em `tests/unit/infrastructure/messaging/sagaConsumer.test.ts`:
  cobre o fluxo feliz ponta a ponta (do ponto de vista do orquestrador) e
  os dois cenários de compensação (pagamento falho, execução falha), além
  de idempotência (evento de falha reentregue para uma OS já cancelada).
