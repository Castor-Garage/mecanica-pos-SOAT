import type { IServiceRepository } from '../../../domain/service/repositories/IServiceRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class DeleteServiceUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(id: string): Promise<void> {
    const service = await this.serviceRepo.findById(id)
    if (!service || !service.isActive) {
      throw new NotFoundError('Serviço', id)
    }

    await this.serviceRepo.softDelete(id)
  }
}
