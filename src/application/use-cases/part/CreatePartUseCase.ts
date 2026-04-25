import type {
  IPartRepository,
  PartRecord,
  CreatePartData,
} from '../../../domain/part/repositories/IPartRepository.js'

export class CreatePartUseCase {
  constructor(private readonly partRepo: IPartRepository) {}

  async execute(data: CreatePartData): Promise<PartRecord> {
    return this.partRepo.create(data)
  }
}
