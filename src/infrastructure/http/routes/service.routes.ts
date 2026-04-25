import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { PrismaServiceRepository } from '../../database/repositories/PrismaServiceRepository.js'
import { CreateServiceUseCase } from '../../../application/use-cases/service/CreateServiceUseCase.js'
import { UpdateServiceUseCase } from '../../../application/use-cases/service/UpdateServiceUseCase.js'
import { DeleteServiceUseCase } from '../../../application/use-cases/service/DeleteServiceUseCase.js'
import { GetServiceUseCase } from '../../../application/use-cases/service/GetServiceUseCase.js'
import { ListServicesUseCase } from '../../../application/use-cases/service/ListServicesUseCase.js'

const serviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  basePrice: z.number(),
  estimatedMinutes: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export async function serviceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>()
  const repo = new PrismaServiceRepository()
  const createUC = new CreateServiceUseCase(repo)
  const updateUC = new UpdateServiceUseCase(repo)
  const deleteUC = new DeleteServiceUseCase(repo)
  const getUC = new GetServiceUseCase(repo)
  const listUC = new ListServicesUseCase(repo)

  typed.get(
    '/services',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Services'],
        summary: 'Listar serviços',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().positive().optional(),
          perPage: z.coerce.number().int().positive().optional(),
          onlyActive: z
            .string()
            .transform((v) => v === 'true')
            .optional(),
        }),
        response: {
          200: z.object({
            data: z.array(serviceSchema),
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
    '/services',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Services'],
        summary: 'Criar serviço',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2),
          description: z.string().optional(),
          basePrice: z.number().positive(),
          estimatedMinutes: z.number().int().positive(),
        }),
        response: { 201: serviceSchema },
      },
    },
    async (request, reply) => {
      const service = await createUC.execute(request.body)
      return reply.status(201).send(service)
    },
  )

  typed.get(
    '/services/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Services'],
        summary: 'Buscar serviço por ID',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: serviceSchema },
      },
    },
    async (request) => {
      return getUC.execute(request.params.id)
    },
  )

  typed.put(
    '/services/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Services'],
        summary: 'Atualizar serviço',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().min(2).optional(),
          description: z.string().nullable().optional(),
          basePrice: z.number().positive().optional(),
          estimatedMinutes: z.number().int().positive().optional(),
          isActive: z.boolean().optional(),
        }),
        response: { 200: serviceSchema },
      },
    },
    async (request) => {
      return updateUC.execute(request.params.id, request.body)
    },
  )

  typed.delete(
    '/services/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Services'],
        summary: 'Deletar serviço (soft delete)',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.void() },
      },
    },
    async (request, reply) => {
      await deleteUC.execute(request.params.id)
      return reply.status(204).send()
    },
  )
}
