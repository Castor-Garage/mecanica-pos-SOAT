import type {
  IClientRepository,
  ClientRecord,
} from '../../../domain/client/repositories/IClientRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class GetClientUseCase {
  constructor(private readonly clientRepo: IClientRepository) {}

  async execute(id: string): Promise<ClientRecord> {
    const client = await this.clientRepo.findById(id)
    if (!client || client.deletedAt) {
      throw new NotFoundError('Cliente', id)
    }
    return client
  }
}
