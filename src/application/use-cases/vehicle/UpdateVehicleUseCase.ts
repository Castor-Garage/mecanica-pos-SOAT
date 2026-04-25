import type {
  IVehicleRepository,
  VehicleRecord,
  UpdateVehicleData,
} from '../../../domain/vehicle/repositories/IVehicleRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

export class UpdateVehicleUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(id: string, data: UpdateVehicleData): Promise<VehicleRecord> {
    const vehicle = await this.vehicleRepo.findById(id)
    if (!vehicle || vehicle.deletedAt) {
      throw new NotFoundError('Veículo', id)
    }
    return this.vehicleRepo.update(id, data)
  }
}
