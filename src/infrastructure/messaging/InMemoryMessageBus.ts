import type { IMessageBus } from '../../domain/shared/messaging/IMessageBus.js'

type Handler = (message: unknown) => Promise<void>

// Adapter provisorio (Fase 4 do backlog): mantem o dominio desacoplado do
// transporte. So funciona dentro do proprio processo - sera substituido por
// um adapter SQS real na Fase 5 (ver ADR 0006), sem alterar nenhum use case,
// ja que ambos implementam a mesma IMessageBus. Identico ao adapter usado em
// mecanica-billing-SOAT e mecanica-execucao-SOAT.
export class InMemoryMessageBus implements IMessageBus {
  private readonly handlers = new Map<string, Handler[]>()

  async publish<T>(queue: string, message: T): Promise<void> {
    const subscribers = this.handlers.get(queue) ?? []
    for (const handler of subscribers) {
      await handler(message)
    }
  }

  subscribe<T>(queue: string, handler: (message: T) => Promise<void>): void {
    const subscribers = this.handlers.get(queue) ?? []
    subscribers.push(handler as Handler)
    this.handlers.set(queue, subscribers)
  }
}
