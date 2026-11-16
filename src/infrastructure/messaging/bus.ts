import { InMemoryMessageBus } from './InMemoryMessageBus.js'
import type { IMessageBus } from '../../domain/shared/messaging/IMessageBus.js'

// Instancia unica do processo. Ainda nao e usada por nenhum use case (ver
// README/ADR 0006) - o orquestrador da saga que vai consumir/publicar nela
// e um incremento futuro, que exige decidir como ele se encaixa no fluxo de
// aprovacao sincrono que ja existe hoje (CreateServiceOrderUseCase,
// ApproveQuoteUseCase). Troque por um adapter SQS real na Fase 5 mantendo
// este ponto de composicao unico.
export const messageBus: IMessageBus = new InMemoryMessageBus()
