import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { PrismaVehicleRepository } from '../../database/repositories/PrismaVehicleRepository.js'
import { PrismaClientRepository } from '../../database/repositories/PrismaClientRepository.js'
import { CreateVehicleUseCase } from '../../../application/use-cases/vehicle/CreateVehicleUseCase.js'
import { UpdateVehicleUseCase } from '../../../application/use-cases/vehicle/UpdateVehicleUseCase.js'
import { DeleteVehicleUseCase } from '../../../application/use-cases/vehicle/DeleteVehicleUseCase.js'
import { GetVehicleUseCase } from '../../../application/use-cases/vehicle/GetVehicleUseCase.js'
import { ListVehiclesUseCase } from '../../../application/use-cases/vehicle/ListVehiclesUseCase.js'

const vehicleSchema = z.object({
  id: z.string().uuid(),
  licensePlate: z.string(),
  brand: z.string(),
  model: z.string(),
  year: z.number().int(),
  color: z.string().nullable(),
  clientId: z.string().uuid(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export async function vehicleRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>()
  const vehicleRepo = new PrismaVehicleRepository()
  const clientRepo = new PrismaClientRepository()
  const createUC = new CreateVehicleUseCase(vehicleRepo, clientRepo)
  const updateUC = new UpdateVehicleUseCase(vehicleRepo)
  const deleteUC = new DeleteVehicleUseCase(vehicleRepo)
  const getUC = new GetVehicleUseCase(vehicleRepo)
  const listUC = new ListVehiclesUseCase(vehicleRepo)

  typed.get(
    '/vehicles',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Vehicles'],
        summary: 'Listar veículos',
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().positive().optional(),
          perPage: z.coerce.number().int().positive().optional(),
          clientId: z.string().uuid().optional(),
        }),
        response: {
          200: z.object({
            data: z.array(vehicleSchema),
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
    '/vehicles',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Vehicles'],
        summary: 'Criar veículo',
        security: [{ bearerAuth: [] }],
        body: z.object({
          licensePlate: z.string().min(7),
          brand: z.string().min(1),
          model: z.string().min(1),
          year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
          color: z.string().optional(),
          clientId: z.string().uuid(),
        }),
        response: { 201: vehicleSchema },
      },
    },
    async (request, reply) => {
      const vehicle = await createUC.execute(request.body)
      return reply.status(201).send(vehicle)
    },
  )

  typed.get(
    '/vehicles/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Vehicles'],
        summary: 'Buscar veículo por ID',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: vehicleSchema },
      },
    },
    async (request) => {
      return getUC.execute(request.params.id)
    },
  )

  typed.put(
    '/vehicles/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Vehicles'],
        summary: 'Atualizar veículo',
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          brand: z.string().min(1).optional(),
          model: z.string().min(1).optional(),
          year: z.number().int().min(1900).optional(),
          color: z.string().nullable().optional(),
        }),
        response: { 200: vehicleSchema },
      },
    },
    async (request) => {
      return updateUC.execute(request.params.id, request.body)
    },
  )

  typed.delete(
    '/vehicles/:id',
    {
      onRequest: [requireAuth],
      schema: {
        tags: ['Vehicles'],
        summary: 'Deletar veículo (soft delete)',
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
