import type {
  IServiceRepository,
  ServiceRecord,
  UpdateServiceData,
} from '../../../domain/service/repositories/IServiceRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class UpdateServiceUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(id: string, data: UpdateServiceData): Promise<ServiceRecord> {
    const service = await this.serviceRepo.findById(id)
    if (!service) {
      throw new NotFoundError('Serviço', id)
    }
    return this.serviceRepo.update(id, data)
  }
}
