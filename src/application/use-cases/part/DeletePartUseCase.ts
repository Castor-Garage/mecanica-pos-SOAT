import type { IPartRepository } from '../../../domain/part/repositories/IPartRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class DeletePartUseCase {
  constructor(private readonly partRepo: IPartRepository) {}

  async execute(id: string): Promise<void> {
    const part = await this.partRepo.findById(id)
    if (!part || !part.isActive) {
      throw new NotFoundError('Peça', id)
    }

    await this.partRepo.softDelete(id)
  }
}
