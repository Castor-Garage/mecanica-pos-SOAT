import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import { OSStatus } from '../../../domain/service-order/value-objects/OSStatus.js'
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/AppError.js'
import type { IMessageBus } from '../../../domain/shared/messaging/IMessageBus.js'
import {
  BILLING_COMMANDS_QUEUE,
  type RejeitarOrcamentoCommand,
} from '../../../domain/shared/messaging/topics.js'

class NullMessageBus implements IMessageBus {
  async publish(): Promise<void> {}
  subscribe(): void {}
}

export class RejectQuoteUseCase {
  constructor(
    private readonly serviceOrderRepo: IServiceOrderRepository,
    // Orquestrador da saga (ver ADR 0006): rejeitar localmente tambem avisa
    // o Billing Service para descartar o orcamento espelhado la.
    private readonly bus: IMessageBus = new NullMessageBus(),
  ) {}

  async execute(id: string, rejectedBy?: string): Promise<ServiceOrderFullRecord> {
    const order = await this.serviceOrderRepo.findById(id)
    if (!order) {
      throw new NotFoundError('Ordem de Serviço', id)
    }

    if (order.status !== OSStatus.AGUARDANDO_APROVACAO) {
      throw new BusinessRuleError(
        `Só é possível rejeitar uma OS com status "Aguardando aprovação". Status atual: "${order.status}"`,
      )
    }

    const rejected = await this.serviceOrderRepo.rejectQuote(id, rejectedBy)

    if (order.billingQuoteId) {
      await this.bus.publish<RejeitarOrcamentoCommand>(BILLING_COMMANDS_QUEUE, {
        type: 'RejeitarOrcamento',
        quoteId: order.billingQuoteId,
      })
    }

    return rejected
  }
}
