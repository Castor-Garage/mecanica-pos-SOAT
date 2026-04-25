import type {
  IClientRepository,
  ClientRecord,
  UpdateClientData,
} from '../../../domain/client/repositories/IClientRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class UpdateClientUseCase {
  constructor(private readonly clientRepo: IClientRepository) {}

  async execute(id: string, data: UpdateClientData): Promise<ClientRecord> {
    const client = await this.clientRepo.findById(id)
    if (!client || client.deletedAt) {
      throw new NotFoundError('Cliente', id)
    }
    return this.clientRepo.update(id, data)
  }
}
