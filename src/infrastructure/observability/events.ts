import type { FastifyBaseLogger } from 'fastify'
import { AppError, IntegrationError } from '../../shared/errors/AppError.js'
import { currentRequestId } from './request-context.js'

export type BusinessEvent =
  | 'service_order.created'
  | 'service_order.status_changed'
  | 'service_order.processing_failed'
  | 'integration.failed'

type Level = 'info' | 'warn' | 'error'

// Failures worth a business event: an order that could not be processed (unexpected
// error, or a business rule blocked it) and failures talking to external systems.
// Auth, not-found and validation errors on order routes are regular client errors.
export function classifyFailure(
  route: string | undefined,
  statusCode: number,
  code: string | undefined,
): { event: BusinessEvent; level: Level; integration?: string } | null {
  const level: Level = statusCode >= 500 ? 'error' : 'warn'

  if (code === 'INTEGRATION_FAILURE') {
    return { event: 'integration.failed', level }
  }

  if (route?.startsWith('/webhooks/')) {
    return { event: 'integration.failed', level, integration: 'email_webhook' }
  }

  if (
    route?.startsWith('/service-orders') &&
    (statusCode >= 500 || code === 'BUSINESS_RULE_VIOLATION' || code === 'INSUFFICIENT_STOCK')
  ) {
    return { event: 'service_order.processing_failed', level }
  }

  return null
}

// Business events are plain log lines with an "event" field, so dashboards and alerts
// can be built on the log search of any tool (New Relic, Datadog...).
export class BusinessEventLogger {
  constructor(private readonly log: FastifyBaseLogger) {}

  emit(event: BusinessEvent, data: Record<string, unknown>, level: Level = 'info'): void {
    this.log[level]({ event, requestId: currentRequestId(), ...data }, event)
  }

  reportFailure(route: string | undefined, statusCode: number, error: Error): void {
    const code = error instanceof AppError ? error.code : undefined
    const failure = classifyFailure(route, statusCode, code)
    if (!failure) return

    this.emit(
      failure.event,
      {
        route,
        statusCode,
        code,
        integration: error instanceof IntegrationError ? error.integration : failure.integration,
        error: error.message,
        cause: error.cause instanceof Error ? error.cause.message : undefined,
      },
      failure.level,
    )
  }
}
