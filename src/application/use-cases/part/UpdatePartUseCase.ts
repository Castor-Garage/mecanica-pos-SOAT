import type {
  IPartRepository,
  PartRecord,
  UpdatePartData,
} from '../../../domain/part/repositories/IPartRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class UpdatePartUseCase {
  constructor(private readonly partRepo: IPartRepository) {}

  async execute(id: string, data: UpdatePartData): Promise<PartRecord> {
    const part = await this.partRepo.findById(id)
    if (!part) {
      throw new NotFoundError('Peça', id)
    }
    return this.partRepo.update(id, data)
  }
}
