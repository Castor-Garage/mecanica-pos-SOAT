import type {
  IVehicleRepository,
  VehicleRecord,
  CreateVehicleData,
} from '../../../domain/vehicle/repositories/IVehicleRepository.js'
import type { IClientRepository } from '../../../domain/client/repositories/IClientRepository.js'
import { LicensePlate } from '../../../domain/vehicle/value-objects/LicensePlate.js'
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js'

export class CreateVehicleUseCase {
  constructor(
    private readonly vehicleRepo: IVehicleRepository,
    private readonly clientRepo: IClientRepository,
  ) {}

  async execute(data: CreateVehicleData): Promise<VehicleRecord> {
    const plate = LicensePlate.create(data.licensePlate)

    const client = await this.clientRepo.findById(data.clientId)
    if (!client || client.deletedAt) {
      throw new NotFoundError('Cliente', data.clientId)
    }

    const existing = await this.vehicleRepo.findByLicensePlate(plate.value)
    if (existing) {
      throw new ConflictError(`Já existe um veículo com a placa ${plate.format()}`)
    }

    return this.vehicleRepo.create({ ...data, licensePlate: plate.value })
  }
}
