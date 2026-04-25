import type {
  IServiceRepository,
  ServiceRecord,
  ListServicesParams,
} from '../../../domain/service/repositories/IServiceRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'

export class ListServicesUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(params: ListServicesParams): Promise<PaginatedResult<ServiceRecord>> {
    return this.serviceRepo.findAll(params)
  }
}
