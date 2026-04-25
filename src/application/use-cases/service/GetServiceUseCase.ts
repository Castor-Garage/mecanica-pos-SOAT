import type {
  IServiceRepository,
  ServiceRecord,
} from '../../../domain/service/repositories/IServiceRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class GetServiceUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(id: string): Promise<ServiceRecord> {
    const service = await this.serviceRepo.findById(id)
    if (!service) {
      throw new NotFoundError('Serviço', id)
    }
    return service
  }
}
