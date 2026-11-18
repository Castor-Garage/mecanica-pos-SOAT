import type { IMessageBus } from '../../domain/shared/messaging/IMessageBus.js'

type Handler = (message: unknown) => Promise<void>

// Adapter usado em testes/desenvolvimento sem AWS (ver ADR 0006). So funciona
// dentro do proprio processo - em producao e substituido por SqsMessageBus,
// sem alterar nenhum use case, ja que ambos implementam a mesma IMessageBus.
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
