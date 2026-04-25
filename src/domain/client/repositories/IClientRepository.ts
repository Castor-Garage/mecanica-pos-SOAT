import type { PaginatedResult, PaginationParams } from '../../../shared/types/pagination.js'

export interface ClientRecord {
  id: string
  name: string
  document: string
  documentType: 'CPF' | 'CNPJ'
  phone: string
  email: string | null
  address: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateClientData {
  name: string
  document: string
  documentType: 'CPF' | 'CNPJ'
  phone: string
  email?: string
  address?: string
}

export interface UpdateClientData {
  name?: string
  phone?: string
  email?: string | null
  address?: string | null
}

export interface ListClientsParams extends PaginationParams {
  search?: string
}

export interface IClientRepository {
  findById(id: string): Promise<ClientRecord | null>
  findByDocument(document: string): Promise<ClientRecord | null>
  findAll(params: ListClientsParams): Promise<PaginatedResult<ClientRecord>>
  create(data: CreateClientData): Promise<ClientRecord>
  update(id: string, data: UpdateClientData): Promise<ClientRecord>
  softDelete(id: string): Promise<void>
}
