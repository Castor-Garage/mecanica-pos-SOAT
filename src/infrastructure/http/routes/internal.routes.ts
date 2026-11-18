import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { PrismaServiceOrderRepository } from '../../database/repositories/PrismaServiceOrderRepository.js'
import { ApproveQuoteUseCase } from '../../../application/use-cases/service-order/ApproveQuoteUseCase.js'
import { BusinessRuleError } from '../../../shared/errors/AppError.js'
import { messageBus } from '../../messaging/bus.js'
import { triggerExecucaoAfterPayment } from '../../messaging/sagaConsumer.js'

// Endpoints internos chamados pelo billing service após eventos de pagamento.
// Sem autenticação — acessíveis apenas internamente (mesma VPC/cluster).
//
// Caminho síncrono (atalho via HTTP) que convive com o caminho assíncrono da
// saga (os-events/sagaConsumer.ts, ver ADR 0006): se a OS já tiver sido
// aprovada manualmente antes do pagamento confirmar (ou se o Stripe reenviar
// o webhook), a transição já não é mais válida — tratado como idempotência,
// não como erro, já que o resultado final (OS aprovada) é o mesmo.
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
      try {
        await approveQuote.execute(serviceOrderId, 'billing-service')
      } catch (err) {
        if (err instanceof BusinessRuleError) {
          request.log.info({ serviceOrderId }, 'payment-confirmed: OS já aprovada, ignorando')
        } else {
          throw err
        }
      }
      // Mesmo proximo passo da saga que o evento PagamentoConfirmado
      // (os-events) dispara - idempotente, ver triggerExecucaoAfterPayment.
      await triggerExecucaoAfterPayment(soRepo, messageBus, serviceOrderId)
      return { ok: true }
    },
  )
}
