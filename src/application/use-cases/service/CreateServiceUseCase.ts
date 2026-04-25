import type {
  IServiceRepository,
  ServiceRecord,
  CreateServiceData,
} from '../../../domain/service/repositories/IServiceRepository.js'

export class CreateServiceUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  async execute(data: CreateServiceData): Promise<ServiceRecord> {
    return this.serviceRepo.create(data)
  }
}
