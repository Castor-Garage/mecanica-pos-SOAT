import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { PrismaServiceOrderRepository } from '../../database/repositories/PrismaServiceOrderRepository.js'
import { ApproveQuoteUseCase } from '../../../application/use-cases/service-order/ApproveQuoteUseCase.js'

// Endpoints internos chamados pelo billing service após eventos de pagamento.
// Sem autenticação — acessíveis apenas internamente (mesma VPC/cluster).
export async function internalRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>()
  const soRepo = new PrismaServiceOrderRepository()
  const approveQuote = new ApproveQuoteUseCase(soRepo)

  typed.post(
    '/internal/payment-confirmed',
    {
      schema: {
        tags: ['Internal'],
        summary: 'Callback do billing após pagamento confirmado — aprova orçamento',
        body: z.object({ serviceOrderId: z.string().uuid() }),
        response: { 200: z.object({ ok: z.boolean() }) },
      },
    },
    async (request) => {
      const { serviceOrderId } = request.body
      await approveQuote.execute(serviceOrderId, 'billing-service')
      return { ok: true }
    },
  )
}
