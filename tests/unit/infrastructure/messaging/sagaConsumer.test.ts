import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyBaseLogger } from 'fastify'
import { handleOsEvent } from '../../../../src/infrastructure/messaging/sagaConsumer.js'
import { InMemoryMessageBus } from '../../../../src/infrastructure/messaging/InMemoryMessageBus.js'
import { OSStatus } from '../../../../src/domain/service-order/value-objects/OSStatus.js'
import {
  EXECUCAO_COMMANDS_QUEUE,
  type OsEvent,
} from '../../../../src/domain/shared/messaging/topics.js'
import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../../src/domain/service-order/repositories/IServiceOrderRepository.js'

const noopLogger = { warn: vi.fn(), error: vi.fn() } as unknown as FastifyBaseLogger

function baseOrder(overrides: Partial<ServiceOrderFullRecord> = {}): ServiceOrderFullRecord {
  return {
    id: 'os-1',
    orderNumber: 'OS-2026-00001',
    status: OSStatus.AGUARDANDO_APROVACAO,
    clientId: 'client-1',
    vehicleId: 'vehicle-1',
    problemDescription: null,
    diagnosis: null,
    quoteTotalAmount: 200,
    quoteApprovedAt: null,
    quoteRejectedAt: null,
    billingQuoteId: null,
    billingPaymentId: null,
    checkoutUrl: null,
    paymentConfirmedAt: null,
    startedAt: null,
    completedAt: null,
    deliveredAt: null,
    technicianNotes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    client: { id: 'client-1', name: 'Cliente', document: '52998224725', phone: '11999999999' },
    vehicle: { id: 'vehicle-1', licensePlate: 'ABC1234', brand: 'VW', model: 'Gol', year: 2020 },
    items: [],
    parts: [],
    ...overrides,
  }
}

function createMockRepo(): IServiceOrderRepository {
  return {
    findById: vi.fn(),
    findByOrderNumber: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    setTimestamp: vi.fn(),
    approveQuote: vi.fn(),
    rejectQuote: vi.fn(),
    getServiceStats: vi.fn(),
    setSagaReferences: vi.fn(),
  }
}

// Fluxo completo da saga (ver ADR 0006), do ponto de vista do orquestrador
// (OS Service): dado que o Billing e o Execução Service publicam os eventos
// documentados no contrato de mensageria, o orquestrador reage corretamente
// em cada etapa - cobre o caminho feliz ponta a ponta exigido no desafio.
describe('Saga - fluxo completo (orquestrador do OS Service)', () => {
  let repo: IServiceOrderRepository
  let bus: InMemoryMessageBus

  beforeEach(() => {
    repo = createMockRepo()
    bus = new InMemoryMessageBus()
  })

  it('Dado que o Billing gerou o orçamento, Então a OS guarda o billingQuoteId', async () => {
    const event: OsEvent = { type: 'OrcamentoGerado', serviceOrderId: 'os-1', quoteId: 'quote-1', totalAmount: 200 }

    await handleOsEvent(event, repo, bus, noopLogger)

    expect(repo.setSagaReferences).toHaveBeenCalledWith('os-1', { billingQuoteId: 'quote-1' })
  })

  it('Dado que o Billing criou a cobrança, Então a OS guarda o checkoutUrl', async () => {
    const event: OsEvent = {
      type: 'PagamentoPendente',
      serviceOrderId: 'os-1',
      quoteId: 'quote-1',
      paymentId: 'payment-1',
      checkoutUrl: 'https://mercadopago.com/checkout/payment-1',
    }

    await handleOsEvent(event, repo, bus, noopLogger)

    expect(repo.setSagaReferences).toHaveBeenCalledWith('os-1', {
      billingPaymentId: 'payment-1',
      checkoutUrl: 'https://mercadopago.com/checkout/payment-1',
    })
  })

  it('Quando o pagamento é confirmado, Então a OS aciona o Execução Service com IniciarExecucao', async () => {
    const received: unknown[] = []
    bus.subscribe(EXECUCAO_COMMANDS_QUEUE, async (msg) => {
      received.push(msg)
    })

    const event: OsEvent = {
      type: 'PagamentoConfirmado',
      serviceOrderId: 'os-1',
      quoteId: 'quote-1',
      paymentId: 'payment-1',
    }

    await handleOsEvent(event, repo, bus, noopLogger)

    expect(repo.setSagaReferences).toHaveBeenCalledWith(
      'os-1',
      expect.objectContaining({ billingPaymentId: 'payment-1' }),
    )
    expect(received).toEqual([{ type: 'IniciarExecucao', serviceOrderId: 'os-1' }])
  })

  it('Quando o Execução Service finaliza, Então a OS avança para FINALIZADA', async () => {
    vi.mocked(repo.findById).mockResolvedValueOnce(baseOrder({ status: OSStatus.EM_EXECUCAO }))

    const event: OsEvent = { type: 'ExecucaoFinalizada', serviceOrderId: 'os-1', executionId: 'exec-1' }
    await handleOsEvent(event, repo, bus, noopLogger)

    expect(repo.updateStatus).toHaveBeenCalledWith(
      'os-1',
      OSStatus.FINALIZADA,
      expect.objectContaining({ notes: expect.any(String) }),
    )
    expect(repo.setTimestamp).toHaveBeenCalledWith('os-1', 'completedAt', expect.any(Date))
  })
})

// Cenário de compensação (ver ADR 0006): quando o pagamento ou a execução
// falham, o orquestrador cancela a OS em vez de deixá-la presa no fluxo.
describe('Saga - compensação (pagamento/execução falham)', () => {
  let repo: IServiceOrderRepository
  let bus: InMemoryMessageBus

  beforeEach(() => {
    repo = createMockRepo()
    bus = new InMemoryMessageBus()
  })

  it('Dado que o pagamento foi recusado, Quando o evento PagamentoFalhou chega, Então a OS é cancelada', async () => {
    vi.mocked(repo.findById).mockResolvedValueOnce(baseOrder({ status: OSStatus.EM_EXECUCAO }))

    const event: OsEvent = {
      type: 'PagamentoFalhou',
      serviceOrderId: 'os-1',
      quoteId: 'quote-1',
      paymentId: 'payment-1',
      reason: 'cartão recusado',
    }
    await handleOsEvent(event, repo, bus, noopLogger)

    expect(repo.updateStatus).toHaveBeenCalledWith(
      'os-1',
      OSStatus.CANCELADA,
      expect.objectContaining({ notes: expect.stringContaining('cartão recusado') }),
    )
  })

  it('Dado que a execução falhou, Quando o evento ExecucaoFalhou chega, Então a OS é cancelada', async () => {
    vi.mocked(repo.findById).mockResolvedValueOnce(baseOrder({ status: OSStatus.EM_EXECUCAO }))

    const event: OsEvent = {
      type: 'ExecucaoFalhou',
      serviceOrderId: 'os-1',
      executionId: 'exec-1',
      reason: 'peça incompatível com o veículo',
    }
    await handleOsEvent(event, repo, bus, noopLogger)

    expect(repo.updateStatus).toHaveBeenCalledWith(
      'os-1',
      OSStatus.CANCELADA,
      expect.objectContaining({ notes: expect.stringContaining('peça incompatível') }),
    )
  })

  it('é idempotente: um evento de falha repetido para uma OS já cancelada não é reaplicado', async () => {
    vi.mocked(repo.findById).mockResolvedValueOnce(baseOrder({ status: OSStatus.CANCELADA }))

    const event: OsEvent = {
      type: 'PagamentoFalhou',
      serviceOrderId: 'os-1',
      quoteId: 'quote-1',
      paymentId: 'payment-1',
      reason: 'reentrega do SQS',
    }
    await handleOsEvent(event, repo, bus, noopLogger)

    expect(repo.updateStatus).not.toHaveBeenCalled()
  })
})
