import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

// Lets code with no access to the Fastify request (repositories, providers) tag its
// logs with the id of the request it is serving.
export const requestContext = new AsyncLocalStorage<{ requestId: string }>()

export function currentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId
}

// Keep the id sent by the caller (API Gateway, front-end) so one id follows the request
// end to end; anything that doesn't look like an id gets a fresh one instead.
export function resolveRequestId(incoming: string | string[] | undefined): string {
  return typeof incoming === 'string' && /^[\w.:=+/-]{1,128}$/.test(incoming)
    ? incoming
    : randomUUID()
}
