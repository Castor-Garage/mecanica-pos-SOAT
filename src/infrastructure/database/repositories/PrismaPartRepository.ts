import type {
  IPartRepository,
  PartRecord,
  CreatePartData,
  UpdatePartData,
  ListPartsParams,
} from '../../../domain/part/repositories/IPartRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'
import { buildPaginationMeta, normalizePagination } from '../../../shared/types/pagination.js'
import { prisma } from '../prisma/client.js'

function toPartRecord(row: {
  id: string
  name: string
  description: string | null
  unitPrice: { toNumber(): number } | number
  stockQuantity: number
  minStock: number
  unit: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): PartRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unitPrice: Number(row.unitPrice),
    stockQuantity: row.stockQuantity,
    minStock: row.minStock,
    unit: row.unit,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export class PrismaPartRepository implements IPartRepository {
  async findById(id: string): Promise<PartRecord | null> {
    const row = await prisma.part.findUnique({ where: { id } })
    return row ? toPartRecord(row) : null
  }

  async findAll(params: ListPartsParams): Promise<PaginatedResult<PartRecord>> {
    const { page, perPage, skip, take } = normalizePagination(params)
    const where = params.onlyActive ? { isActive: true } : {}

    const [rows, total] = await prisma.$transaction([
      prisma.part.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      prisma.part.count({ where }),
    ])

    return { data: rows.map(toPartRecord), meta: buildPaginationMeta(total, page, perPage) }
  }

  async create(data: CreatePartData): Promise<PartRecord> {
    const row = await prisma.part.create({ data })
    return toPartRecord(row)
  }

  async update(id: string, data: UpdatePartData): Promise<PartRecord> {
    const row = await prisma.part.update({ where: { id }, data })
    return toPartRecord(row)
  }
}
