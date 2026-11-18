# ADR 0006 — Arquitetura de microsserviços (Fase 4): split em 3 serviços e saga orquestrada

- **Status**: Aceito
- **Supersede**: ADR 0001 (padrão de comunicação), no que diz respeito à
  comunicação entre serviços — permanece válido para a comunicação
  HTTP/cliente deste repositório
- **Autores**: Time Castor Garage
- **Relacionado a**: RFC 0004 (banco por serviço), `docs/context-map.mmd`,
  `docs/component-diagram.mmd`

## Contexto

A Fase 4 exige transformar a aplicação única (`mecanica-pos-SOAT`) em no
mínimo 3 microsserviços independentes (repositório, banco e infraestrutura
próprios), comunicação assíncrona entre eles, Saga Pattern para o fluxo
orçamento → aprovação → pagamento → execução, e pelo menos um banco não
relacional no conjunto.

## Decisão

### Divisão de serviços

- **OS Service** (este repositório) — mantém `client`, `vehicle`,
  `service`, `part`, `admin`/auth **e** o agregado `ServiceOrder`. É o
  **orquestrador da saga**: único dono da máquina de estados da OS
  (`OSStatus`).
- **Billing Service** (`mecanica-billing-SOAT`) — orçamento, aprovação e
  pagamento (Mercado Pago). Banco próprio (Postgres) + NoSQL (ver RFC 0004).
- **Execução/Produção Service** (`mecanica-execucao-SOAT`) — fila de
  execução (diagnóstico → execução → finalizada). Banco próprio (Postgres).

Cadastro/catálogo/admin permaneceram no OS Service (não viraram um 4º
serviço) para não multiplicar repositórios/pipelines além do mínimo exigido
— nenhum dos dois domínios troca de dono ao longo do fluxo de uma OS, então
não há ganho de isolamento em separá-los.

### Mensageria

Amazon SQS, 3 filas, abstraídas atrás da porta `IMessageBus`
(`publish`/`subscribe`) em cada um dos 3 serviços:

| Fila | Publica | Consome |
|---|---|---|
| `billing-commands` | OS Service (`GerarOrcamento`, `AprovarOrcamento`, `RejeitarOrcamento`) | Billing Service |
| `execucao-commands` | OS Service (`IniciarExecucao`) | Execução Service |
| `os-events` | Billing Service (`OrcamentoGerado`, `OrcamentoRejeitado`, `PagamentoPendente`, `PagamentoConfirmado`, `PagamentoFalhou`) e Execução Service (`ExecucaoFinalizada`, `ExecucaoFalhou`) | OS Service |

Dois adapters por serviço: `InMemoryMessageBus` (testes/dev, roda só dentro
do próprio processo) e `SqsMessageBus` (produção — long polling real via
`@aws-sdk/client-sqs`). A escolha é feita em `bus.ts` pela variável
`MESSAGE_BUS_DRIVER=sqs`; sem ela, usa o adapter em memória. `SqsMessageBus`
aceita `SQS_ENDPOINT` para apontar para um endpoint compatível com SQS (ex.
LocalStack), o que permite rodar a saga real localmente sem depender da
conta AWS Academy — ver `docs/demo-local-saga.md`.

### Saga orquestrada no OS Service

O OS Service é o único dono da máquina de estados da OS. O `sagaConsumer.ts`
consome `os-events` e decide a próxima transição/comando — Billing e
Execução nunca decidem o status da OS, só publicam fatos sobre o que
aconteceu do lado deles.

Fluxo feliz:

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

Compensação: `PagamentoFalhou` ou `ExecucaoFalhou` cancelam a OS (novo
status `CANCELADA`, terminal). Essa transição só é acionada pelo
`sagaConsumer.ts` — os endpoints manuais (`/approve`, `/reject`, `/advance`)
nunca levam uma OS a `CANCELADA`.

### Convivência com o fluxo local existente

O OS Service **continua calculando e aprovando o orçamento localmente**
(como antes da Fase 4) — o catálogo já é resolvido no próprio OS Service ao
criar a OS, então o `quoteTotalAmount` local existe desde a criação, sem
depender de rede. Isso é mantido por dois motivos: (1) não quebrar o
contrato já usado pelo front-end e pelos testes existentes; (2) permitir
que a operação básica da oficina (abrir, diagnosticar, aprovar, executar)
funcione mesmo se o Billing Service estiver fora do ar.

Em paralelo, o mesmo comando `GerarOrcamento` é publicado para o Billing
Service, que calcula seu **próprio** orçamento (`Quote`) de forma
independente — os dois valores devem coincidir, já que usam o mesmo
catálogo. É o `Quote` do Billing (não o `quoteTotalAmount` local) que vira
a cobrança real no Mercado Pago. Aprovar/rejeitar localmente aciona o
comando equivalente no Billing (`AprovarOrcamento`/`RejeitarOrcamento`).

Fica registrado como dívida técnica para uma fase futura: unificar os dois
caminhos (fazer o OS Service esperar o `OrcamentoGerado` do Billing antes
de liberar a aprovação), hoje não feito pelo prazo da Fase 4.

## Alternativas consideradas

- **Coreografia pura (sem orquestrador)** — rejeitada: cada serviço
  reagiria a eventos dos outros sem um dono único da máquina de estados da
  OS, dificultando raciocinar sobre o estado agregado e sobre quem decide a
  compensação.
- **RabbitMQ/Kafka** — rejeitado pelo mesmo motivo do RFC 0001: já usamos
  AWS Academy/EKS/RDS; SQS é gerenciado e não exige broker próprio para
  operar sob o prazo da fase.
- **Remover completamente o cálculo local de orçamento do OS Service** —
  avaliada, mas descartada por ora (ver "Convivência" acima) dado o prazo.

## Consequências

- Nenhum serviço acessa diretamente o banco de outro — toda troca é via
  mensageria (este ADR) ou, pontualmente, API REST.
- `OSStatus` ganhou o estado `CANCELADA` (migration
  `20261118000944_add_saga_fields`) e 4 colunas novas em `ServiceOrder`
  (`billingQuoteId`, `billingPaymentId`, `checkoutUrl`,
  `paymentConfirmedAt`) — todas preenchidas só pelo `sagaConsumer.ts`.
- Testado em `tests/unit/infrastructure/messaging/sagaConsumer.test.ts`:
  cobre o fluxo feliz ponta a ponta (do ponto de vista do orquestrador) e os
  dois cenários de compensação (pagamento falho, execução falha), além de
  idempotência (evento de falha reentregue para uma OS já cancelada).
