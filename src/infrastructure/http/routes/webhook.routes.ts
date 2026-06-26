import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { PrismaServiceOrderRepository } from '../../database/repositories/PrismaServiceOrderRepository.js'
import { UpdateStatusByEmailUseCase } from '../../../application/use-cases/service-order/UpdateStatusByEmailUseCase.js'
import { UnauthorizedError } from '../../../shared/errors/AppError.js'

export async function webhookRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>()

  const soRepo = new PrismaServiceOrderRepository()
  const emailUC = new UpdateStatusByEmailUseCase(soRepo)

  typed.post(
    '/webhooks/email',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Atualização de status de OS via e-mail',
        description:
          'Recebe notificação de e-mail e atualiza o status da OS identificada no conteúdo. ' +
          'Palavras-chave reconhecidas: APROVAR, REJEITAR, AVANÇAR. ' +
          'Número da OS deve seguir o formato OS-YYYY-NNNNN (ex: OS-2025-00001).',
        body: z.object({
          subject: z.string().min(1),
          body: z.string(),
          from: z.string().email(),
        }),
        response: {
          200: z.object({
            message: z.string(),
            orderNumber: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const token = request.headers['x-webhook-token'] as string | undefined
      const secret = process.env.WEBHOOK_SECRET
      if (secret && token !== secret) {
        throw new UnauthorizedError('Token de webhook inválido')
      }
      return emailUC.execute(request.body)
    },
  )
}
