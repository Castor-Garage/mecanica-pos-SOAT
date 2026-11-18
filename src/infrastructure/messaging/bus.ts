import { InMemoryMessageBus } from './InMemoryMessageBus.js'
import { SqsMessageBus } from './SqsMessageBus.js'
import type { IMessageBus } from '../../domain/shared/messaging/IMessageBus.js'

// Instancia unica do processo - o orquestrador da saga (sagaConsumer.ts) e as
// rotas/use cases que publicam comandos (CreateServiceOrderUseCase,
// ApproveQuoteUseCase, RejectQuoteUseCase) compartilham a mesma instancia.
// MESSAGE_BUS_DRIVER=sqs liga no Amazon SQS (ou LocalStack via SQS_ENDPOINT,
// ver docs/demo-local-saga.md); sem a variavel, usa o adapter em memoria
// (testes/dev sem fila nenhuma).
export const messageBus: IMessageBus =
  process.env.MESSAGE_BUS_DRIVER === 'sqs' ? new SqsMessageBus() : new InMemoryMessageBus()
