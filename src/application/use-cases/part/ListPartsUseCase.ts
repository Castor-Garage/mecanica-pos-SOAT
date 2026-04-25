import type {
  IPartRepository,
  PartRecord,
  ListPartsParams,
} from '../../../domain/part/repositories/IPartRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'

export class ListPartsUseCase {
  constructor(private readonly partRepo: IPartRepository) {}

  async execute(params: ListPartsParams): Promise<PaginatedResult<PartRecord>> {
    return this.partRepo.findAll(params)
  }
}
