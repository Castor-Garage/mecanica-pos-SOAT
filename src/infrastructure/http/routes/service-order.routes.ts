import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { PrismaServiceOrderRepository } from '../../database/repositories/PrismaServiceOrderRepository.js'
import { PrismaClientRepository } from '../../database/repositories/PrismaClientRepository.js'
import { PrismaVehicleRepository } from '../../database/repositories/PrismaVehicleRepository.js'
import { PrismaServiceRepository } from '../../database/repositories/PrismaServiceRepository.js'
import { PrismaPartRepository } from '../../database/repositories/PrismaPartRepository.js'
import { CreateServiceOrderUseCase } from '../../../application/use-cases/service-order/CreateServiceOrderUseCase.js'
import { AdvanceStatusUseCase } from '../../../application/use-cases/service-order/AdvanceStatusUseCase.js'
import { ApproveQuoteUseCase } from '../../../application/use-cases/service-order/ApproveQuoteUseCase.js'
import { RejectQuoteUseCase } from '../../../application/use-cases/service-order/RejectQuoteUseCase.js'
import { GetServiceOrderUseCase } from '../../../application/use-cases/service-order/GetServiceOrderUseCase.js'
import { ListServiceOrdersUseCase } from '../../../application/use-cases/service-order/ListServiceOrdersUseCase.js'
import { GetServiceStatsUseCase } from '../../../application/use-cases/service-order/GetServiceStatsUseCase.js'
import { OSStatus } from '../../../domain/service-order/value-objects/OSStatus.js'

const orderItemSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
})

const orderPartSchema = z.object({
  id: z.string().uuid(),
  partId: z.string().uuid(),
  partName: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
})

const orderListSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: z.nativeEnum(OSStatus),
  clientId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  problemDescription: z.string().nullable(),
  diagnosis: z.string().nullable(),
  quoteTotalAmount: z.number().nullable(),
  quoteApprovedAt: z.date().nullable(),
  quoteRejectedAt: z.date().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  deliveredAt: z.date().nullable(),
  technicianNotes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

const orderFullSchema = orderListSchema.extend({
  client: z.object({ id: z.string(), name: z.string(), document: z.string(), phone: z.string() }),
  vehicle: z.object({
    id: z.string(),
    licensePlate: z.string(),
    brand: z.string(),
    model: z.string(),
    year: z.number(),
  }),
  items: z.array(orderItemSchema),
  parts: z.array(orderPartSchema),
})

export async function serviceOrderRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>()

  const soRepo = new PrismaServiceOrderRepository()
  const clientRepo = new PrismaClientRepository()
  const vehicleRepo = new PrismaVehicleRepository()
  const serviceRepo = new PrismaServiceRepository()
  const partRepo = new PrismaPartRepository()

  const createUC = new CreateServiceOrderUseCase(soRepo, clientRepo, vehicleRepo, serviceRepo, partRepo)
  const advanceUC = new AdvanceStatusUseCase(soRepo)
  const approveUC = new ApproveQuoteUseCase(soRepo)
  const rejectUC = new RejectQuoteUseCase(soRepo)
  const getUC = new GetServiceOrderUseCase(soRepo)
  const listUC = new ListServiceOrdersUseCase(soRepo)
  const statsUC = new GetServiceStatsUseCase(soRepo)

  // stats must be registered before /:id to avoid route conflict
  typed.get(
    '/service-orders/stats',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Service Orders'],
        summary: 'Tempo médio de execução por serviço',
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(
            z.object({
              serviceId: z.string().uuid(),
              serviceName: z.string(),
              completedOrders: z.number().int(),
              avgExecutionMinutes: z.number(),
            }),
          ),
        },
      },
    },
    async () => {
      return statsUC.execute()
    },
  )

  typed.get(
    '/service-orders',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Service Orders'],
        summary: 'Listar ordens de serviço',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().positive().optional(),
          perPage: z.coerce.number().int().positive().optional(),
          status: z.nativeEnum(OSStatus).optional(),
          clientId: z.string().uuid().optional(),
        }),
        response: {
          200: z.object({
            data: z.array(orderListSchema),
            meta: z.object({
              total: z.number(),
              page: z.number(),
              perPage: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
    async (request) => {
      return listUC.execute(request.query)
    },
  )

  typed.post(
    '/service-orders',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Service Orders'],
        summary: 'Criar ordem de serviço',
        security: [{ bearerAuth: [] }],
        body: z.object({
          clientId: z.string().uuid(),
          vehicleId: z.string().uuid(),
          problemDescription: z.string().optional(),
          services: z
            .array(
              z.object({
                serviceId: z.string().uuid(),
                quantity: z.number().int().positive().optional(),
              }),
            )
            .min(1),
          parts: z
            .array(
              z.object({
                partId: z.string().uuid(),
                quantity: z.number().int().positive(),
              }),
            )
            .optional(),
        }),
        response: { 201: orderFullSchema },
      },
    },
    async (request, reply) => {
      const order = await createUC.execute(request.body)
      return reply.status(201).send(order)
    },
  )

  typed.get(
    '/service-orders/:id',
    {
      schema: {
        tags: ['Service Orders'],
        summary: 'Buscar ordem de serviço (público — cliente acompanha)',
        params: z.object({ id: z.string().uuid() }),
        response: { 200: orderFullSchema },
      },
    },
    async (request) => {
      return getUC.execute(request.params.id)
    },
  )

  typed.post(
    '/service-orders/:id/advance',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Service Orders'],
        summary: 'Avançar status da OS',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ notes: z.string().optional() }).optional(),
        response: { 200: orderListSchema },
      },
    },
    async (request) => {
      const notes = request.body?.notes
      const changedBy = request.user?.email
      return advanceUC.execute(request.params.id, { notes, changedBy })
    },
  )

  typed.post(
    '/service-orders/:id/approve',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Service Orders'],
        summary: 'Aprovar orçamento da OS',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: orderFullSchema },
      },
    },
    async (request) => {
      const approvedBy = request.user?.email
      return approveUC.execute(request.params.id, approvedBy)
    },
  )

  typed.post(
    '/service-orders/:id/reject',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Service Orders'],
        summary: 'Rejeitar orçamento da OS',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ notes: z.string().optional() }).optional(),
        response: { 200: orderFullSchema },
      },
    },
    async (request) => {
      const rejectedBy = request.user?.email
      return rejectUC.execute(request.params.id, rejectedBy)
    },
  )
}
