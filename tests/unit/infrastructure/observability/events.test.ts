import { describe, it, expect, vi } from 'vitest'
import type { FastifyBaseLogger } from 'fastify'
import {
  BusinessEventLogger,
  classifyFailure,
} from '../../../../src/infrastructure/observability/events.js'
import { requestContext } from '../../../../src/infrastructure/observability/request-context.js'
import {
  BusinessRuleError,
  IntegrationError,
  NotFoundError,
} from '../../../../src/shared/errors/AppError.js'

function fakeLog() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

function eventLoggerWith(log: ReturnType<typeof fakeLog>) {
  return new BusinessEventLogger(log as unknown as FastifyBaseLogger)
}

describe('classifyFailure', () => {
  it('flags unexpected errors on order routes as processing failures', () => {
    expect(classifyFailure('/service-orders/:id/advance', 500, undefined)).toEqual({
      event: 'service_order.processing_failed',
      level: 'error',
    })
  })

  it('flags business rules that blocked an order as warnings', () => {
    expect(classifyFailure('/service-orders/:id/approve', 422, 'INSUFFICIENT_STOCK')).toEqual({
      event: 'service_order.processing_failed',
      level: 'warn',
    })
    expect(classifyFailure('/service-orders/:id/advance', 422, 'BUSINESS_RULE_VIOLATION')?.event).toBe(
      'service_order.processing_failed',
    )
  })

  it('ignores regular client errors on order routes', () => {
    expect(classifyFailure('/service-orders/:id', 404, 'NOT_FOUND')).toBeNull()
    expect(classifyFailure('/service-orders', 401, 'UNAUTHORIZED')).toBeNull()
    expect(classifyFailure('/service-orders', 422, undefined)).toBeNull()
  })

  it('treats any webhook failure as an e-mail integration failure', () => {
    expect(classifyFailure('/webhooks/email', 401, 'UNAUTHORIZED')).toEqual({
      event: 'integration.failed',
      level: 'warn',
      integration: 'email_webhook',
    })
  })

  it('treats integration errors on any route as integration failures', () => {
    expect(classifyFailure('/service-orders/:id/send-email', 502, 'INTEGRATION_FAILURE')).toEqual({
      event: 'integration.failed',
      level: 'error',
    })
  })

  it('ignores failures outside orders and integrations', () => {
    expect(classifyFailure('/clients', 500, undefined)).toBeNull()
    expect(classifyFailure(undefined, 404, undefined)).toBeNull()
  })
})

describe('BusinessEventLogger', () => {
  it('tags events with the id of the current request', () => {
    const log = fakeLog()
    requestContext.run({ requestId: 'req-1' }, () => {
      eventLoggerWith(log).emit('service_order.created', { orderId: 'order-1' })
    })
    expect(log.info).toHaveBeenCalledWith(
      { event: 'service_order.created', requestId: 'req-1', orderId: 'order-1' },
      'service_order.created',
    )
  })

  it('reports an SMTP failure with the integration name and the original cause', () => {
    const log = fakeLog()
    const error = new IntegrationError(
      'smtp',
      'Não foi possível enviar o e-mail.',
      new Error('connection refused'),
    )
    eventLoggerWith(log).reportFailure('/service-orders/:id/send-email', 502, error)
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'integration.failed',
        integration: 'smtp',
        statusCode: 502,
        code: 'INTEGRATION_FAILURE',
        cause: 'connection refused',
      }),
      'integration.failed',
    )
  })

  it('reports an order blocked by a business rule as a warning', () => {
    const log = fakeLog()
    eventLoggerWith(log).reportFailure(
      '/service-orders/:id/advance',
      422,
      new BusinessRuleError('Status terminal'),
    )
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'service_order.processing_failed', error: 'Status terminal' }),
      'service_order.processing_failed',
    )
  })

  it('does not report regular client errors', () => {
    const log = fakeLog()
    eventLoggerWith(log).reportFailure('/service-orders/:id', 404, new NotFoundError('Ordem de Serviço'))
    expect(log.info).not.toHaveBeenCalled()
    expect(log.warn).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })
})
