import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import { OSStatus } from '../../../domain/service-order/value-objects/OSStatus.js'
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/AppError.js'

export class ApproveQuoteUseCase {
  constructor(private readonly serviceOrderRepo: IServiceOrderRepository) {}

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

    return this.serviceOrderRepo.approveQuote(id, approvedBy)
  }
}
