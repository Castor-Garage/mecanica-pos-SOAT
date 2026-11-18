import newrelic from 'newrelic'
import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import { OSStatus } from '../../../domain/service-order/value-objects/OSStatus.js'
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/AppError.js'
import type { IMessageBus } from '../../../domain/shared/messaging/IMessageBus.js'
import {
  BILLING_COMMANDS_QUEUE,
  type AprovarOrcamentoCommand,
} from '../../../domain/shared/messaging/topics.js'

class NullMessageBus implements IMessageBus {
  async publish(): Promise<void> {}
  subscribe(): void {}
}

export class ApproveQuoteUseCase {
  constructor(
    private readonly serviceOrderRepo: IServiceOrderRepository,
    // Orquestrador da saga (ver ADR 0006): aprovar localmente tambem aciona
    // o Billing Service a gerar a cobranca no Mercado Pago para o orcamento
    // espelhado la, quando a OS ja tiver recebido o OrcamentoGerado.
    private readonly bus: IMessageBus = new NullMessageBus(),
  ) {}

  async execute(id: string, approvedBy?: string): Promise<ServiceOrderFullRecord> {
    const order = await this.serviceOrderRepo.findById(id)
    if (!order) {
      throw new NotFoundError('Ordem de Serviço', id)
    }

    if (order.status !== OSStatus.AGUARDANDO_APROVACAO) {
      throw new BusinessRuleError(
        `Só é possível aprovar uma OS com status "Aguardando aprovação". Status atual: "${order.status}"`,
      )
    }

    const approved = await this.serviceOrderRepo.approveQuote(id, approvedBy)

    newrelic.addCustomAttribute('saga.serviceOrderId', id)

    if (order.billingQuoteId) {
      newrelic.addCustomAttribute('saga.commandPublished', 'AprovarOrcamento')
      await this.bus.publish<AprovarOrcamentoCommand>(BILLING_COMMANDS_QUEUE, {
        type: 'AprovarOrcamento',
        quoteId: order.billingQuoteId,
      })
    }

    return approved
  }
}
