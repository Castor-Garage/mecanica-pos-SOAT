import type { PaginatedResult, PaginationParams } from '../../../shared/types/pagination.js'

export interface VehicleRecord {
  id: string
  licensePlate: string
  brand: string
  model: string
  year: number
  color: string | null
  clientId: string
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateVehicleData {
  licensePlate: string
  brand: string
  model: string
  year: number
  color?: string
  clientId: string
}

export interface UpdateVehicleData {
  brand?: string
  model?: string
  year?: number
  color?: string | null
}

export interface ListVehiclesParams extends PaginationParams {
  clientId?: string
}

export interface IVehicleRepository {
  findById(id: string): Promise<VehicleRecord | null>
  findByLicensePlate(licensePlate: string): Promise<VehicleRecord | null>
  findAll(params: ListVehiclesParams): Promise<PaginatedResult<VehicleRecord>>
  create(data: CreateVehicleData): Promise<VehicleRecord>
  update(id: string, data: UpdateVehicleData): Promise<VehicleRecord>
  softDelete(id: string): Promise<void>
}
