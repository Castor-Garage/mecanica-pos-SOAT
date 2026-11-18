import type { FastifyBaseLogger } from 'fastify'
import newrelic from 'newrelic'
import { messageBus } from './bus.js'
import { PrismaServiceOrderRepository } from '../database/repositories/PrismaServiceOrderRepository.js'
import { OSStatus, canTransition } from '../../domain/service-order/value-objects/OSStatus.js'
import {
  OS_EVENTS_QUEUE,
  EXECUCAO_COMMANDS_QUEUE,
  type OsEvent,
  type IniciarExecucaoCommand,
} from '../../domain/shared/messaging/topics.js'
import type { IServiceOrderRepository } from '../../domain/service-order/repositories/IServiceOrderRepository.js'
import type { IMessageBus } from '../../domain/shared/messaging/IMessageBus.js'

// Orquestrador da saga (ver ADR 0006): o OS Service e o unico dono da
// maquina de estados da OS. Este consumer reage aos eventos publicados por
// Billing e Execução em os-events, atualiza a OS e, quando o proximo passo
// da saga exige, publica o comando seguinte (IniciarExecucao). Nunca acessa
// o banco de Billing/Execução diretamente - só o que vem na mensagem.
export function bootstrapSagaConsumer(log: FastifyBaseLogger): void {
  const serviceOrderRepo = new PrismaServiceOrderRepository()

  messageBus.subscribe<OsEvent>(OS_EVENTS_QUEUE, async (event) => {
    // Consumo de fila nao passa por uma transacao HTTP, entao o agente do New
    // Relic nao traca nada aqui por padrao - sem isso, cada passo da saga e
    // invisivel no APM. startBackgroundTransaction cria uma transacao propria
    // por evento, com o tipo e a OS como atributos pesquisaveis.
    await newrelic.startBackgroundTransaction(`saga/os-events/${event.type}`, async () => {
      const transaction = newrelic.getTransaction()
      newrelic.addCustomAttribute('eventType', event.type)
      newrelic.addCustomAttribute('serviceOrderId', event.serviceOrderId)
      try {
        await handleOsEvent(event, serviceOrderRepo, messageBus, log)
      } catch (error) {
        newrelic.noticeError(error as Error)
        log.error({ err: error, event }, 'Falha ao processar evento da saga (os-events)')
      } finally {
        transaction.end()
      }
    })
  })
}

export async function handleOsEvent(
  event: OsEvent,
  serviceOrderRepo: IServiceOrderRepository,
  bus: IMessageBus,
  log: FastifyBaseLogger,
): Promise<void> {
  switch (event.type) {
    case 'OrcamentoGerado':
      await serviceOrderRepo.setSagaReferences(event.serviceOrderId, {
        billingQuoteId: event.quoteId,
      })
      break

    case 'OrcamentoRejeitado':
      // O fluxo local de rejeicao (RejectQuoteUseCase) ja move a OS de volta
      // para EM_DIAGNOSTICO antes deste evento chegar - nada a fazer aqui.
      break

    case 'PagamentoPendente':
      await serviceOrderRepo.setSagaReferences(event.serviceOrderId, {
        billingPaymentId: event.paymentId,
        checkoutUrl: event.checkoutUrl,
      })
      break

    case 'PagamentoConfirmado':
      await triggerExecucaoAfterPayment(serviceOrderRepo, bus, event.serviceOrderId, event.paymentId)
      break

    case 'PagamentoFalhou':
      await compensate(
        serviceOrderRepo,
        event.serviceOrderId,
        `Pagamento recusado pelo Mercado Pago: ${event.reason}`,
        log,
      )
      break

    case 'ExecucaoFinalizada':
      await advanceToFinalizada(serviceOrderRepo, event.serviceOrderId, log)
      break

    case 'ExecucaoFalhou':
      await compensate(
        serviceOrderRepo,
        event.serviceOrderId,
        `Execução reportou falha: ${event.reason}`,
        log,
      )
      break
  }
}

// Acionado tanto pelo evento PagamentoConfirmado (os-events) quanto pelo
// callback sincrono POST /internal/payment-confirmed que o Billing chama
// como fallback quando o SQS nao esta disponivel (ver internal.routes.ts) -
// os dois caminhos convergem aqui. Idempotente via paymentConfirmedAt: so
// publica IniciarExecucao na primeira vez, para nao abrir a fila de
// execucao duas vezes quando ambos os caminhos chegam para a mesma OS.
export async function triggerExecucaoAfterPayment(
  serviceOrderRepo: IServiceOrderRepository,
  bus: IMessageBus,
  serviceOrderId: string,
  paymentId?: string,
): Promise<void> {
  const order = await serviceOrderRepo.findById(serviceOrderId)
  if (!order) return
  if (order.paymentConfirmedAt) return

  await serviceOrderRepo.setSagaReferences(serviceOrderId, {
    ...(paymentId ? { billingPaymentId: paymentId } : {}),
    paymentConfirmedAt: new Date(),
  })

  // Proximo passo da saga: aciona o Execução Service para abrir a fila de
  // execucao desta OS (ver ADR 0006).
  await bus.publish<IniciarExecucaoCommand>(EXECUCAO_COMMANDS_QUEUE, {
    type: 'IniciarExecucao',
    serviceOrderId,
  })
}

async function advanceToFinalizada(
  serviceOrderRepo: IServiceOrderRepository,
  serviceOrderId: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const order = await serviceOrderRepo.findById(serviceOrderId)
  if (!order) {
    log.warn({ serviceOrderId }, 'ExecucaoFinalizada recebido para OS inexistente')
    return
  }
  if (!canTransition(order.status, OSStatus.FINALIZADA)) {
    // Idempotencia: SQS pode reentregar a mesma mensagem.
    log.warn({ serviceOrderId, status: order.status }, 'ExecucaoFinalizada ignorado - transição inválida')
    return
  }

  await serviceOrderRepo.updateStatus(serviceOrderId, OSStatus.FINALIZADA, {
    notes: 'Execução finalizada (saga)',
  })
  await serviceOrderRepo.setTimestamp(serviceOrderId, 'completedAt', new Date())
}

// Acionado tanto pelo evento PagamentoFalhou/ExecucaoFalhou (os-events)
// quanto pelo callback sincrono POST /internal/payment-failed que o Billing
// chama como fallback quando o SQS nao esta disponivel (ver
// internal.routes.ts) - mesma idempotencia dos outros pontos de entrada:
// se a OS ja nao estiver mais num estado que aceite cancelamento (ex. ja
// cancelada por este mesmo motivo), a chamada e ignorada.
export async function compensate(
  serviceOrderRepo: IServiceOrderRepository,
  serviceOrderId: string,
  reason: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const order = await serviceOrderRepo.findById(serviceOrderId)
  if (!order) {
    log.warn({ serviceOrderId }, 'Compensação recebida para OS inexistente')
    return
  }
  if (!canTransition(order.status, OSStatus.CANCELADA)) {
    log.warn({ serviceOrderId, status: order.status }, 'Compensação ignorada - transição inválida')
    return
  }

  await serviceOrderRepo.updateStatus(serviceOrderId, OSStatus.CANCELADA, { notes: reason })
}
