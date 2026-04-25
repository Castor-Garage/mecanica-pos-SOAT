import type {
  IVehicleRepository,
  VehicleRecord,
  CreateVehicleData,
  UpdateVehicleData,
  ListVehiclesParams,
} from '../../../domain/vehicle/repositories/IVehicleRepository.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'
import { buildPaginationMeta, normalizePagination } from '../../../shared/types/pagination.js'
import { prisma } from '../prisma/client.js'

export class PrismaVehicleRepository implements IVehicleRepository {
  async findById(id: string): Promise<VehicleRecord | null> {
    return prisma.vehicle.findUnique({ where: { id } })
  }

  async findByLicensePlate(licensePlate: string): Promise<VehicleRecord | null> {
    return prisma.vehicle.findUnique({ where: { licensePlate } })
  }

  async findAll(params: ListVehiclesParams): Promise<PaginatedResult<VehicleRecord>> {
    const { page, perPage, skip, take } = normalizePagination(params)

    const where = {
      deletedAt: null,
      ...(params.clientId ? { clientId: params.clientId } : {}),
    }

    const [data, total] = await prisma.$transaction([
      prisma.vehicle.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.vehicle.count({ where }),
    ])

    return { data, meta: buildPaginationMeta(total, page, perPage) }
  }

  async create(data: CreateVehicleData): Promise<VehicleRecord> {
    return prisma.vehicle.create({ data })
  }

  async update(id: string, data: UpdateVehicleData): Promise<VehicleRecord> {
    return prisma.vehicle.update({ where: { id }, data })
  }

  async softDelete(id: string): Promise<void> {
    await prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
