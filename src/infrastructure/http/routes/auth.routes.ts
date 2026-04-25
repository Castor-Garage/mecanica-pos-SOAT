import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { LoginUseCase } from '../../../application/use-cases/auth/LoginUseCase.js'
import { PrismaAdminRepository } from '../../database/repositories/PrismaAdminRepository.js'

export async function authRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>()
  const adminRepo = new PrismaAdminRepository()
  const loginUseCase = new LoginUseCase(adminRepo)

  typed.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login do administrador',
        body: z.object({
          email: z.string().email(),
          password: z.string().min(1),
        }),
        response: {
          200: z.object({
            token: z.string(),
            admin: z.object({ id: z.string(), name: z.string(), email: z.string() }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body
      const admin = await loginUseCase.execute(email, password)
      const token = app.jwt.sign({ sub: admin.id, email: admin.email })
      return reply.send({ token, admin: { id: admin.id, name: admin.name, email: admin.email } })
    },
  )
}
