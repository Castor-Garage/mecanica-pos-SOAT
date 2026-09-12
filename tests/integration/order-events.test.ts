import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { buildTestApp, loginAsAdmin, authHeader, type TestApp } from './helpers.js'
import { PrismaServiceOrderRepository } from '../../src/infrastructure/database/repositories/PrismaServiceOrderRepository.js'
import type { BusinessEventLogger } from '../../src/infrastructure/observability/events.js'
import { OSStatus } from '../../src/domain/service-order/value-objects/OSStatus.js'

describe('Service order business events', () => {
  let app: TestApp
  let token: string
  let emit: ReturnType<typeof vi.fn>
  let repo: PrismaServiceOrderRepository
  let clientId: string
  let vehicleId: string
  let serviceId: string

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
    token = await loginAsAdmin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  async function post(url: string, payload: object): Promise<string> {
    const response = await app.inject({ method: 'POST', url, headers: authHeader(token), payload })
    return response.json<{ id: string }>().id
  }

  function openOrder(parts: Array<{ partId: string; quantity: number; unitPrice: number }> = []) {
    return repo.create({
      clientId,
      vehicleId,
      services: [{ serviceId, quantity: 1, unitPrice: 120 }],
      parts,
      quoteTotalAmount: 120,
    })
  }

  // setup.ts truncates the database before each test, so the catalog is rebuilt every time
  beforeEach(async () => {
    emit = vi.fn()
    repo = new PrismaServiceOrderRepository({ emit } as unknown as BusinessEventLogger)
    clientId = await post('/clients', {
      name: 'Maria Souza',
      document: '529.982.247-25',
      documentType: 'CPF',
      phone: '11999990000',
    })
    vehicleId = await post('/vehicles', {
      licensePlate: 'ABC1234',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
      clientId,
    })
    serviceId = await post('/services', { name: 'Troca de Óleo', basePrice: 120.0, estimatedMinutes: 60 })
  })

  it('emits service_order.created when an order is opened', async () => {
    const order = await openOrder()
    expect(emit).toHaveBeenCalledWith(
      'service_order.created',
      expect.objectContaining({
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientId,
        quoteTotalAmount: 120,
      }),
    )
  })

  it('emits status_changed with the time spent in the previous status', async () => {
    const order = await openOrder()
    await repo.updateStatus(order.id, OSStatus.EM_DIAGNOSTICO)
    expect(emit).toHaveBeenLastCalledWith(
      'service_order.status_changed',
      expect.objectContaining({
        orderId: order.id,
        fromStatus: 'RECEBIDA',
        toStatus: 'EM_DIAGNOSTICO',
        secondsInPreviousStatus: expect.any(Number),
      }),
    )
  })

  it('emits status_changed when the quote is rejected and when it is approved', async () => {
    const order = await openOrder()
    await repo.updateStatus(order.id, OSStatus.EM_DIAGNOSTICO)
    await repo.updateStatus(order.id, OSStatus.AGUARDANDO_APROVACAO)

    await repo.rejectQuote(order.id)
    expect(emit).toHaveBeenLastCalledWith(
      'service_order.status_changed',
      expect.objectContaining({ fromStatus: 'AGUARDANDO_APROVACAO', toStatus: 'EM_DIAGNOSTICO' }),
    )

    await repo.updateStatus(order.id, OSStatus.AGUARDANDO_APROVACAO)
    await repo.approveQuote(order.id)
    expect(emit).toHaveBeenLastCalledWith(
      'service_order.status_changed',
      expect.objectContaining({ fromStatus: 'AGUARDANDO_APROVACAO', toStatus: 'EM_EXECUCAO' }),
    )
  })

  it('emits nothing when an approval is rolled back for missing stock', async () => {
    const partId = await post('/parts', { name: 'Filtro de Óleo', unitPrice: 45.0, stockQuantity: 1 })
    const order = await openOrder([{ partId, quantity: 5, unitPrice: 45 }])
    await repo.updateStatus(order.id, OSStatus.EM_DIAGNOSTICO)
    await repo.updateStatus(order.id, OSStatus.AGUARDANDO_APROVACAO)
    emit.mockClear()

    await expect(repo.approveQuote(order.id)).rejects.toThrow('Estoque insuficiente')
    expect(emit).not.toHaveBeenCalled()
  })
})
