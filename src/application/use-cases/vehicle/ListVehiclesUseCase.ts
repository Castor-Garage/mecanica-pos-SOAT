import type {
  IVehicleRepository,
  VehicleRecord,
  ListVehiclesParams,
} from '../../../domain/vehicle/repositories/IVehicleRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'

export class ListVehiclesUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(params: ListVehiclesParams): Promise<PaginatedResult<VehicleRecord>> {
    return this.vehicleRepo.findAll(params)
  }
}
