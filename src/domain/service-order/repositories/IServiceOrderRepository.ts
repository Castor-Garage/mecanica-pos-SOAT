import type { OSStatus } from '../value-objects/OSStatus.js'
import type { PaginatedResult, PaginationParams } from '../../../shared/types/pagination.js'

export interface ServiceOrderItemRecord {
  id: string
  serviceId: string
  serviceName: string
  quantity: number
  unitPrice: number
}

export interface ServiceOrderPartRecord {
  id: string
  partId: string
  partName: string
  quantity: number
  unitPrice: number
}

export interface ServiceOrderRecord {
  id: string
  orderNumber: string
  status: OSStatus
  clientId: string
  vehicleId: string
  problemDescription: string | null
  diagnosis: string | null
  quoteTotalAmount: number | null
  quoteApprovedAt: Date | null
  quoteRejectedAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  deliveredAt: Date | null
  technicianNotes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ServiceOrderFullRecord extends ServiceOrderRecord {
  client: { id: string; name: string; document: string; phone: string }
  vehicle: { id: string; licensePlate: string; brand: string; model: string; year: number }
  items: ServiceOrderItemRecord[]
  parts: ServiceOrderPartRecord[]
}

export interface CreateServiceOrderData {
  clientId: string
  vehicleId: string
  problemDescription?: string
  services: Array<{ serviceId: string; quantity: number; unitPrice: number }>
  parts: Array<{ partId: string; quantity: number; unitPrice: number }>
  quoteTotalAmount: number
}

export interface ListServiceOrdersParams extends PaginationParams {
  status?: OSStatus
  clientId?: string
}

export interface ServiceStatRecord {
  serviceId: string
  serviceName: string
  completedOrders: number
  avgExecutionMinutes: number
}

export interface IServiceOrderRepository {
  findById(id: string): Promise<ServiceOrderFullRecord | null>
  findAll(params: ListServiceOrdersParams): Promise<PaginatedResult<ServiceOrderRecord>>
  create(data: CreateServiceOrderData): Promise<ServiceOrderFullRecord>
  updateStatus(
    id: string,
    toStatus: OSStatus,
    opts?: { notes?: string; changedBy?: string },
  ): Promise<ServiceOrderRecord>
  setTimestamp(
    id: string,
    field: 'startedAt' | 'completedAt' | 'deliveredAt',
    value: Date,
  ): Promise<void>
  approveQuote(id: string, approvedBy?: string): Promise<ServiceOrderFullRecord>
  rejectQuote(id: string, rejectedBy?: string): Promise<ServiceOrderFullRecord>
  getServiceStats(): Promise<ServiceStatRecord[]>
}
