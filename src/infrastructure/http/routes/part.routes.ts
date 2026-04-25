import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { PrismaPartRepository } from '../../database/repositories/PrismaPartRepository.js'
import { CreatePartUseCase } from '../../../application/use-cases/part/CreatePartUseCase.js'
import { UpdatePartUseCase } from '../../../application/use-cases/part/UpdatePartUseCase.js'
import { GetPartUseCase } from '../../../application/use-cases/part/GetPartUseCase.js'
import { ListPartsUseCase } from '../../../application/use-cases/part/ListPartsUseCase.js'

const partSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  unitPrice: z.number(),
  stockQuantity: z.number().int(),
  minStock: z.number().int(),
  unit: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export async function partRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>()
  const repo = new PrismaPartRepository()
  const createUC = new CreatePartUseCase(repo)
  const updateUC = new UpdatePartUseCase(repo)
  const getUC = new GetPartUseCase(repo)
  const listUC = new ListPartsUseCase(repo)

  typed.get(
    '/parts',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Parts'],
        summary: 'Listar peças',
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
            data: z.array(partSchema),
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
    '/parts',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Parts'],
        summary: 'Criar peça',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2),
          description: z.string().optional(),
          unitPrice: z.number().positive(),
          stockQuantity: z.number().int().min(0).optional(),
          minStock: z.number().int().min(0).optional(),
          unit: z.string().optional(),
        }),
        response: { 201: partSchema },
      },
    },
    async (request, reply) => {
      const part = await createUC.execute(request.body)
      return reply.status(201).send(part)
    },
  )

  typed.get(
    '/parts/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Parts'],
        summary: 'Buscar peça por ID',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: partSchema },
      },
    },
    async (request) => {
      return getUC.execute(request.params.id)
    },
  )

  typed.put(
    '/parts/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Parts'],
        summary: 'Atualizar peça',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().min(2).optional(),
          description: z.string().nullable().optional(),
          unitPrice: z.number().positive().optional(),
          stockQuantity: z.number().int().min(0).optional(),
          minStock: z.number().int().min(0).optional(),
          unit: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
        response: { 200: partSchema },
      },
    },
    async (request) => {
      return updateUC.execute(request.params.id, request.body)
    },
  )
}
