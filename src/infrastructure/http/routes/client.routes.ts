import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { PrismaClientRepository } from '../../database/repositories/PrismaClientRepository.js'
import { CreateClientUseCase } from '../../../application/use-cases/client/CreateClientUseCase.js'
import { UpdateClientUseCase } from '../../../application/use-cases/client/UpdateClientUseCase.js'
import { DeleteClientUseCase } from '../../../application/use-cases/client/DeleteClientUseCase.js'
import { GetClientUseCase } from '../../../application/use-cases/client/GetClientUseCase.js'
import { ListClientsUseCase } from '../../../application/use-cases/client/ListClientsUseCase.js'

const clientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  document: z.string(),
  documentType: z.enum(['CPF', 'CNPJ']),
  phone: z.string(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
})

const paginatedResponse = z.object({
  data: z.array(clientSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    perPage: z.number(),
    totalPages: z.number(),
  }),
})

export async function clientRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>()
  const repo = new PrismaClientRepository()
  const createUC = new CreateClientUseCase(repo)
  const updateUC = new UpdateClientUseCase(repo)
  const deleteUC = new DeleteClientUseCase(repo)
  const getUC = new GetClientUseCase(repo)
  const listUC = new ListClientsUseCase(repo)

  typed.get(
    '/clients',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Clients'],
        summary: 'Listar clientes',
        security: [{ bearerAuth: [] }],
        querystring: paginationQuery,
        response: { 200: paginatedResponse },
      },
    },
    async (request) => {
      return listUC.execute(request.query)
    },
  )

  typed.post(
    '/clients',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Clients'],
        summary: 'Criar cliente',
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2),
          document: z.string().min(11),
          documentType: z.enum(['CPF', 'CNPJ']),
          phone: z.string().min(8),
          email: z.string().email().optional(),
          address: z.string().optional(),
        }),
        response: { 201: clientSchema },
      },
    },
    async (request, reply) => {
      const client = await createUC.execute(request.body)
      return reply.status(201).send(client)
    },
  )

  typed.get(
    '/clients/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Clients'],
        summary: 'Buscar cliente por ID',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: clientSchema },
      },
    },
    async (request) => {
      return getUC.execute(request.params.id)
    },
  )

  typed.put(
    '/clients/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Clients'],
        summary: 'Atualizar cliente',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().min(2).optional(),
          phone: z.string().min(8).optional(),
          email: z.string().email().nullable().optional(),
          address: z.string().nullable().optional(),
        }),
        response: { 200: clientSchema },
      },
    },
    async (request) => {
      return updateUC.execute(request.params.id, request.body)
    },
  )

  typed.delete(
    '/clients/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Clients'],
        summary: 'Deletar cliente (soft delete)',
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
