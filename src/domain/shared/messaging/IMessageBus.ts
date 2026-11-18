// Porta de mensageria (ver ADR 0006). O OS Service e o orquestrador da saga:
// publica comandos para Billing/Execução e consome os eventos que eles
// publicam em os-events. O codigo de aplicacao depende apenas desta
// interface - o adapter concreto (InMemoryMessageBus em testes,
// SqsMessageBus em producao) fica isolado na camada de infraestrutura.
export interface IMessageBus {
  publish<T>(queue: string, message: T): Promise<void>
  subscribe<T>(queue: string, handler: (message: T) => Promise<void>): void
}
