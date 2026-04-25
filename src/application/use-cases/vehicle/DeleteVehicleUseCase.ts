import type { IVehicleRepository } from '../../../domain/vehicle/repositories/IVehicleRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class DeleteVehicleUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(id: string): Promise<void> {
    const vehicle = await this.vehicleRepo.findById(id)
    if (!vehicle || vehicle.deletedAt) {
      throw new NotFoundError('Veículo', id)
    }
    await this.vehicleRepo.softDelete(id)
  }
}
