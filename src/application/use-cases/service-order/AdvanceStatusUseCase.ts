import type {
  IServiceOrderRepository,
  ServiceOrderRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import { OSStatus, assertTransition } from '../../../domain/service-order/value-objects/OSStatus.js'
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/AppError.js'

export class AdvanceStatusUseCase {
  constructor(private readonly serviceOrderRepo: IServiceOrderRepository) {}

  async execute(
    id: string,
    opts?: { notes?: string; changedBy?: string },
  ): Promise<ServiceOrderRecord> {
    const order = await this.serviceOrderRepo.findById(id)
    if (!order) {
      throw new NotFoundError('Ordem de Serviço', id)
    }

    if (order.status === OSStatus.AGUARDANDO_APROVACAO) {
      throw new BusinessRuleError(
        'Use os endpoints /approve ou /reject para avançar o status de aprovação',
      )
    }

    const nextStatuses: OSStatus[] = {
      [OSStatus.RECEBIDA]: [OSStatus.EM_DIAGNOSTICO],
      [OSStatus.EM_DIAGNOSTICO]: [OSStatus.AGUARDANDO_APROVACAO],
      [OSStatus.EM_EXECUCAO]: [OSStatus.FINALIZADA],
      [OSStatus.FINALIZADA]: [OSStatus.ENTREGUE],
      [OSStatus.AGUARDANDO_APROVACAO]: [],
      [OSStatus.ENTREGUE]: [],
    }[order.status]

    const toStatus = nextStatuses[0]
    if (!toStatus) {
      throw new BusinessRuleError(`Status "${order.status}" é terminal — não há próximo estado`)
    }

    assertTransition(order.status, toStatus)

    const updated = await this.serviceOrderRepo.updateStatus(id, toStatus, opts)

    if (toStatus === OSStatus.FINALIZADA) {
      await this.serviceOrderRepo.setTimestamp(id, 'completedAt', new Date())
    } else if (toStatus === OSStatus.ENTREGUE) {
      await this.serviceOrderRepo.setTimestamp(id, 'deliveredAt', new Date())
    }

    return updated
  }
}
