import type { IClientRepository } from '../../../domain/client/repositories/IClientRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class DeleteClientUseCase {
  constructor(private readonly clientRepo: IClientRepository) {}

  async execute(id: string): Promise<void> {
    const client = await this.clientRepo.findById(id)
    if (!client || client.deletedAt) {
      throw new NotFoundError('Cliente', id)
    }
    await this.clientRepo.softDelete(id)
  }
}
