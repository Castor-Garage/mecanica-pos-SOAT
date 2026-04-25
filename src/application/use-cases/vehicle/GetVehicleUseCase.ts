import type {
  IVehicleRepository,
  VehicleRecord,
} from '../../../domain/vehicle/repositories/IVehicleRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class GetVehicleUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(id: string): Promise<VehicleRecord> {
    const vehicle = await this.vehicleRepo.findById(id)
    if (!vehicle || vehicle.deletedAt) {
      throw new NotFoundError('Veículo', id)
    }
    return vehicle
  }
}
