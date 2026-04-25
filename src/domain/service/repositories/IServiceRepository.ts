import type { PaginatedResult, PaginationParams } from '../../../shared/types/pagination.js'

export interface ServiceRecord {
  id: string
  name: string
  description: string | null
  basePrice: number
  estimatedMinutes: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateServiceData {
  name: string
  description?: string
  basePrice: number
  estimatedMinutes: number
}

export interface UpdateServiceData {
  name?: string
  description?: string | null
  basePrice?: number
  estimatedMinutes?: number
  isActive?: boolean
}

export interface ListServicesParams extends PaginationParams {
  onlyActive?: boolean
}

export interface IServiceRepository {
  findById(id: string): Promise<ServiceRecord | null>
  findAll(params: ListServicesParams): Promise<PaginatedResult<ServiceRecord>>
  create(data: CreateServiceData): Promise<ServiceRecord>
  update(id: string, data: UpdateServiceData): Promise<ServiceRecord>
}
