import type {
  IClientRepository,
  ClientRecord,
  ListClientsParams,
} from '../../../domain/client/repositories/IClientRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'

export class ListClientsUseCase {
  constructor(private readonly clientRepo: IClientRepository) {}

  async execute(params: ListClientsParams): Promise<PaginatedResult<ClientRecord>> {
    return this.clientRepo.findAll(params)
  }
}
