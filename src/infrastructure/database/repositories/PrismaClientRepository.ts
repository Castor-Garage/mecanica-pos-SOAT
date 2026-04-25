import type {
  IClientRepository,
  ClientRecord,
  CreateClientData,
  UpdateClientData,
  ListClientsParams,
} from '../../../domain/client/repositories/IClientRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'
import { buildPaginationMeta, normalizePagination } from '../../../shared/types/pagination.js'
import { prisma } from '../prisma/client.js'

export class PrismaClientRepository implements IClientRepository {
  async findById(id: string): Promise<ClientRecord | null> {
    return prisma.client.findUnique({ where: { id } })
  }

  async findByDocument(document: string): Promise<ClientRecord | null> {
    return prisma.client.findUnique({ where: { document } })
  }

  async findAll(params: ListClientsParams): Promise<PaginatedResult<ClientRecord>> {
    const { page, perPage, skip, take } = normalizePagination(params)

    const where = {
      deletedAt: null,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' as const } },
              { document: { contains: params.search } },
              { email: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [data, total] = await prisma.$transaction([
      prisma.client.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      prisma.client.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(total, page, perPage) }
  }

  async create(data: CreateClientData): Promise<ClientRecord> {
    return prisma.client.create({ data })
  }

  async update(id: string, data: UpdateClientData): Promise<ClientRecord> {
    return prisma.client.update({ where: { id }, data })
  }

  async softDelete(id: string): Promise<void> {
    await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
