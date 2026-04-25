import type {
  IServiceRepository,
  ServiceRecord,
  CreateServiceData,
  UpdateServiceData,
  ListServicesParams,
} from '../../../domain/service/repositories/IServiceRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'
import { buildPaginationMeta, normalizePagination } from '../../../shared/types/pagination.js'
import { prisma } from '../prisma/client.js'

function toServiceRecord(row: {
  id: string
  name: string
  description: string | null
  basePrice: { toNumber(): number } | number
  estimatedMinutes: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): ServiceRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    basePrice: Number(row.basePrice),
    estimatedMinutes: row.estimatedMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class PrismaServiceRepository implements IServiceRepository {
  async findById(id: string): Promise<ServiceRecord | null> {
    const row = await prisma.service.findUnique({ where: { id } })
    return row ? toServiceRecord(row) : null
  }

  async findAll(params: ListServicesParams): Promise<PaginatedResult<ServiceRecord>> {
    const { page, perPage, skip, take } = normalizePagination(params)
    const where = params.onlyActive ? { isActive: true } : {}

    const [rows, total] = await prisma.$transaction([
      prisma.service.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      prisma.service.count({ where }),
    ])

    return { data: rows.map(toServiceRecord), meta: buildPaginationMeta(total, page, perPage) }
  }

  async create(data: CreateServiceData): Promise<ServiceRecord> {
    const row = await prisma.service.create({ data })
    return toServiceRecord(row)
  }

  async update(id: string, data: UpdateServiceData): Promise<ServiceRecord> {
    const row = await prisma.service.update({ where: { id }, data })
    return toServiceRecord(row)
  }
}
