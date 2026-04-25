import type {
  IPartRepository,
  PartRecord,
} from '../../../domain/part/repositories/IPartRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class GetPartUseCase {
  constructor(private readonly partRepo: IPartRepository) {}

  async execute(id: string): Promise<PartRecord> {
    const part = await this.partRepo.findById(id)
    if (!part) {
      throw new NotFoundError('Peça', id)
    }
    return part
  }
}
