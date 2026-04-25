import type {
  IServiceOrderRepository,
  ServiceOrderRecord,
  ListServiceOrdersParams,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'

export class ListServiceOrdersUseCase {
  constructor(private readonly serviceOrderRepo: IServiceOrderRepository) {}

  async execute(params: ListServiceOrdersParams): Promise<PaginatedResult<ServiceOrderRecord>> {
    return this.serviceOrderRepo.findAll(params)
  }
}
