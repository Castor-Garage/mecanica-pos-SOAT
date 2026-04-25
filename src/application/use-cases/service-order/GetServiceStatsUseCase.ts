import type {
  IServiceOrderRepository,
  ServiceStatRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'

export class GetServiceStatsUseCase {
  constructor(private readonly serviceOrderRepo: IServiceOrderRepository) {}

  async execute(): Promise<ServiceStatRecord[]> {
    return this.serviceOrderRepo.getServiceStats()
  }
}
