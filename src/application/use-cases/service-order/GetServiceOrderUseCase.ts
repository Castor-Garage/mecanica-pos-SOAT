import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class GetServiceOrderUseCase {
  constructor(private readonly serviceOrderRepo: IServiceOrderRepository) {}

  async execute(id: string): Promise<ServiceOrderFullRecord> {
    const order = await this.serviceOrderRepo.findById(id)
    if (!order) {
      throw new NotFoundError('Ordem de Serviço', id)
    }
    return order
  }
}
