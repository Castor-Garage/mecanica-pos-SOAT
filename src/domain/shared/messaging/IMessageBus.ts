// Porta de mensageria (ver ADR 0006). O codigo de dominio/aplicacao depende
// apenas desta interface - o adapter concreto (InMemoryMessageBus hoje, SQS
// real na Fase 5 do backlog) fica isolado na camada de infraestrutura e
// pode ser trocado sem tocar nos use cases. Identica a versao usada em
// mecanica-billing-SOAT e mecanica-execucao-SOAT - os 3 repositorios ainda
// nao compartilham um pacote npm comum, entao o contrato e replicado e
// precisa ser mantido em sincronia manualmente entre eles (ver topics.ts).
export interface IMessageBus {
  publish<T>(queue: string, message: T): Promise<void>
  subscribe<T>(queue: string, handler: (message: T) => Promise<void>): void
}
