import type { PaginatedResult, PaginationParams } from '../../../shared/types/pagination.js'

export interface PartRecord {
  id: string
  name: string
  description: string | null
  unitPrice: number
  stockQuantity: number
  minStock: number
  unit: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreatePartData {
  name: string
  description?: string
  unitPrice: number
  stockQuantity?: number
  minStock?: number
  unit?: string
}

export interface UpdatePartData {
  name?: string
  description?: string | null
  unitPrice?: number
  stockQuantity?: number
  minStock?: number
  unit?: string
  isActive?: boolean
}

export interface ListPartsParams extends PaginationParams {
  onlyActive?: boolean
}

export interface IPartRepository {
  findById(id: string): Promise<PartRecord | null>
  findAll(params: ListPartsParams): Promise<PaginatedResult<PartRecord>>
  create(data: CreatePartData): Promise<PartRecord>
  update(id: string, data: UpdatePartData): Promise<PartRecord>
}
