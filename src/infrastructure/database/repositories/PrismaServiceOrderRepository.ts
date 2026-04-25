import type {
  IServiceOrderRepository,
  ServiceOrderRecord,
  ServiceOrderFullRecord,
  ServiceOrderItemRecord,
  ServiceOrderPartRecord,
  CreateServiceOrderData,
  ListServiceOrdersParams,
  ServiceStatRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import { OSStatus } from '../../../domain/service-order/value-objects/OSStatus.js'
import type { PaginatedResult } from '../../../shared/types/pagination.js'
import { buildPaginationMeta, normalizePagination } from '../../../shared/types/pagination.js'
import { prisma } from '../prisma/client.js'
import { NotFoundError, InsufficientStockError } from '../../../shared/errors/AppError.js'
import type { Prisma } from '@prisma/client'

const fullInclude = {
  client: { select: { id: true, name: true, document: true, phone: true } },
  vehicle: { select: { id: true, licensePlate: true, brand: true, model: true, year: true } },
  items: { include: { service: { select: { name: true } } } },
  parts: { include: { part: { select: { name: true } } } },
} satisfies Prisma.ServiceOrderInclude

type ServiceOrderWithRelations = Prisma.ServiceOrderGetPayload<{ include: typeof fullInclude }>

function toRecord(row: ServiceOrderWithRelations): ServiceOrderFullRecord {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status as OSStatus,
    clientId: row.clientId,
    vehicleId: row.vehicleId,
    problemDescription: row.problemDescription,
    diagnosis: row.diagnosis,
    quoteTotalAmount: row.quoteTotalAmount ? Number(row.quoteTotalAmount) : null,
    quoteApprovedAt: row.quoteApprovedAt,
    quoteRejectedAt: row.quoteRejectedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    deliveredAt: row.deliveredAt,
    technicianNotes: row.technicianNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    client: row.client,
    vehicle: row.vehicle,
    items: row.items.map(
      (i): ServiceOrderItemRecord => ({
        id: i.id,
        serviceId: i.serviceId,
        serviceName: i.service.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      }),
    ),
    parts: row.parts.map(
      (p): ServiceOrderPartRecord => ({
        id: p.id,
        partId: p.partId,
        partName: p.part.name,
        quantity: p.quantity,
        unitPrice: Number(p.unitPrice),
      }),
    ),
  }
}

function toListRecord(row: {
  id: string
  orderNumber: string
  status: string
  clientId: string
  vehicleId: string
  problemDescription: string | null
  diagnosis: string | null
  quoteTotalAmount: { toNumber(): number } | number | null
  quoteApprovedAt: Date | null
  quoteRejectedAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  deliveredAt: Date | null
  technicianNotes: string | null
  createdAt: Date
  updatedAt: Date
}): ServiceOrderRecord {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status as OSStatus,
    clientId: row.clientId,
    vehicleId: row.vehicleId,
    problemDescription: row.problemDescription,
    diagnosis: row.diagnosis,
    quoteTotalAmount: row.quoteTotalAmount ? Number(row.quoteTotalAmount) : null,
    quoteApprovedAt: row.quoteApprovedAt,
    quoteRejectedAt: row.quoteRejectedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    deliveredAt: row.deliveredAt,
    technicianNotes: row.technicianNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0')
  return `OS-${year}-${rand}`
}

export class PrismaServiceOrderRepository implements IServiceOrderRepository {
  async findById(id: string): Promise<ServiceOrderFullRecord | null> {
    const row = await prisma.serviceOrder.findUnique({ where: { id }, include: fullInclude })
    return row ? toRecord(row) : null
  }

  async findAll(params: ListServiceOrdersParams): Promise<PaginatedResult<ServiceOrderRecord>> {
    const { page, perPage, skip, take } = normalizePagination(params)

    const where: Prisma.ServiceOrderWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.clientId ? { clientId: params.clientId } : {}),
    }

    const [rows, total] = await prisma.$transaction([
      prisma.serviceOrder.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.serviceOrder.count({ where }),
    ])

    return { data: rows.map(toListRecord), meta: buildPaginationMeta(total, page, perPage) }
  }

  async create(data: CreateServiceOrderData): Promise<ServiceOrderFullRecord> {
    let orderNumber = generateOrderNumber()
    // Ensure uniqueness
    while (await prisma.serviceOrder.findUnique({ where: { orderNumber } })) {
      orderNumber = generateOrderNumber()
    }

    const row = await prisma.serviceOrder.create({
      data: {
        orderNumber,
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        problemDescription: data.problemDescription,
        quoteTotalAmount: data.quoteTotalAmount,
        items: {
          create: data.services.map((s) => ({
            serviceId: s.serviceId,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
          })),
        },
        parts: {
          create: data.parts.map((p) => ({
            partId: p.partId,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })),
        },
        statusHistory: {
          create: { toStatus: OSStatus.RECEBIDA, notes: 'OS criada' },
        },
      },
      include: fullInclude,
    })

    return toRecord(row)
  }

  async updateStatus(
    id: string,
    toStatus: OSStatus,
    opts?: { notes?: string; changedBy?: string },
  ): Promise<ServiceOrderRecord> {
    const current = await prisma.serviceOrder.findUnique({ where: { id } })
    if (!current) throw new NotFoundError('Ordem de Serviço', id)

    const row = await prisma.serviceOrder.update({
      where: { id },
      data: {
        status: toStatus,
        statusHistory: {
          create: {
            fromStatus: current.status,
            toStatus,
            changedBy: opts?.changedBy,
            notes: opts?.notes,
          },
        },
      },
    })

    return toListRecord(row)
  }

  async setTimestamp(
    id: string,
    field: 'startedAt' | 'completedAt' | 'deliveredAt',
    value: Date,
  ): Promise<void> {
    await prisma.serviceOrder.update({ where: { id }, data: { [field]: value } })
  }

  async approveQuote(id: string, approvedBy?: string): Promise<ServiceOrderFullRecord> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id },
        include: { parts: { include: { part: true } } },
      })
      if (!order) throw new NotFoundError('Ordem de Serviço', id)

      for (const p of order.parts) {
        if (p.part.stockQuantity < p.quantity) {
          throw new InsufficientStockError(p.part.name, p.part.stockQuantity, p.quantity)
        }
      }

      for (const p of order.parts) {
        await tx.part.update({
          where: { id: p.partId },
          data: { stockQuantity: { decrement: p.quantity } },
        })
      }

      const now = new Date()
      const row = await tx.serviceOrder.update({
        where: { id },
        data: {
          status: OSStatus.EM_EXECUCAO,
          quoteApprovedAt: now,
          startedAt: now,
          statusHistory: {
            create: {
              fromStatus: OSStatus.AGUARDANDO_APROVACAO,
              toStatus: OSStatus.EM_EXECUCAO,
              changedBy: approvedBy,
              notes: 'Orçamento aprovado',
            },
          },
        },
        include: fullInclude,
      })

      return toRecord(row)
    })
  }

  async rejectQuote(id: string, rejectedBy?: string): Promise<ServiceOrderFullRecord> {
    const now = new Date()
    const row = await prisma.serviceOrder.update({
      where: { id },
      data: {
        status: OSStatus.EM_DIAGNOSTICO,
        quoteRejectedAt: now,
        statusHistory: {
          create: {
            fromStatus: OSStatus.AGUARDANDO_APROVACAO,
            toStatus: OSStatus.EM_DIAGNOSTICO,
            changedBy: rejectedBy,
            notes: 'Orçamento rejeitado — reavaliação necessária',
          },
        },
      },
      include: fullInclude,
    })

    return toRecord(row)
  }

  async getServiceStats(): Promise<ServiceStatRecord[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        serviceId: string
        serviceName: string
        completedOrders: bigint
        avgExecutionMinutes: number | null
      }>
    >`
      SELECT
        s.id AS "serviceId",
        s.name AS "serviceName",
        COUNT(DISTINCT so.id) AS "completedOrders",
        AVG(EXTRACT(EPOCH FROM (so.completed_at - so.started_at)) / 60) AS "avgExecutionMinutes"
      FROM service_order_items soi
      JOIN services s ON s.id = soi.service_id
      JOIN service_orders so ON so.id = soi.service_order_id
      WHERE so.status IN ('FINALIZADA', 'ENTREGUE')
        AND so.started_at IS NOT NULL
        AND so.completed_at IS NOT NULL
      GROUP BY s.id, s.name
      ORDER BY s.name
    `

    return rows.map((r) => ({
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      completedOrders: Number(r.completedOrders),
      avgExecutionMinutes: Number(r.avgExecutionMinutes ?? 0),
    }))
  }
}
