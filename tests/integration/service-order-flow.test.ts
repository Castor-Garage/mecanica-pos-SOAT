import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, loginAsAdmin, authHeader, type TestApp } from './helpers.js'

describe('Service Order full workflow', () => {
  let app: TestApp
  let token: string

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
    token = await loginAsAdmin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('runs full workflow end-to-end', async () => {
    const client = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: authHeader(token),
      payload: {
        name: 'Maria Souza',
        document: '529.982.247-25',
        documentType: 'CPF',
        phone: '11999990000',
      },
    })
    const clientId = client.json<{ id: string }>().id

    const vehicle = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: authHeader(token),
      payload: {
        licensePlate: 'ABC1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        clientId,
      },
    })
    const vehicleId = vehicle.json<{ id: string }>().id

    const service = await app.inject({
      method: 'POST',
      url: '/services',
      headers: authHeader(token),
      payload: {
        name: 'Troca de Óleo',
        basePrice: 120.0,
        estimatedMinutes: 60,
      },
    })
    const serviceId = service.json<{ id: string }>().id

    const part = await app.inject({
      method: 'POST',
      url: '/parts',
      headers: authHeader(token),
      payload: {
        name: 'Filtro de Óleo',
        unitPrice: 45.0,
        stockQuantity: 10,
      },
    })
    const partId = part.json<{ id: string }>().id

    const createOrder = await app.inject({
      method: 'POST',
      url: '/service-orders',
      headers: authHeader(token),
      payload: {
        clientId,
        vehicleId,
        problemDescription: 'Motor fazendo barulho',
        services: [{ serviceId, quantity: 1 }],
        parts: [{ partId, quantity: 2 }],
      },
    })

    expect(createOrder.statusCode).toBe(201)
    const order = createOrder.json<{
      id: string
      status: string
      quoteTotalAmount: number
      orderNumber: string
    }>()
    expect(order.status).toBe('RECEBIDA')
    expect(order.orderNumber).toMatch(/^OS-\d{4}-\d{5}$/)
    expect(order.quoteTotalAmount).toBe(210)

    const toDiagnostico = await app.inject({
      method: 'POST',
      url: `/service-orders/${order.id}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    expect(toDiagnostico.statusCode).toBe(200)
    expect(toDiagnostico.json<{ status: string }>().status).toBe('EM_DIAGNOSTICO')

    const toAprovacao = await app.inject({
      method: 'POST',
      url: `/service-orders/${order.id}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    expect(toAprovacao.statusCode).toBe(200)
    expect(toAprovacao.json<{ status: string }>().status).toBe('AGUARDANDO_APROVACAO')

    const blockedAdvance = await app.inject({
      method: 'POST',
      url: `/service-orders/${order.id}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    expect(blockedAdvance.statusCode).toBe(422)

    const approve = await app.inject({
      method: 'POST',
      url: `/service-orders/${order.id}/approve`,
      headers: authHeader(token),
    })
    expect(approve.statusCode).toBe(200)
    expect(approve.json<{ status: string }>().status).toBe('EM_EXECUCAO')

    const partAfterApproval = await app.inject({
      method: 'GET',
      url: `/parts/${partId}`,
      headers: authHeader(token),
    })
    expect(partAfterApproval.json<{ stockQuantity: number }>().stockQuantity).toBe(8)

    const toFinalizada = await app.inject({
      method: 'POST',
      url: `/service-orders/${order.id}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    expect(toFinalizada.statusCode).toBe(200)
    expect(toFinalizada.json<{ status: string }>().status).toBe('FINALIZADA')

    const toEntregue = await app.inject({
      method: 'POST',
      url: `/service-orders/${order.id}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    expect(toEntregue.statusCode).toBe(200)
    expect(toEntregue.json<{ status: string }>().status).toBe('ENTREGUE')

    const terminalAdvance = await app.inject({
      method: 'POST',
      url: `/service-orders/${order.id}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    expect(terminalAdvance.statusCode).toBe(422)

    const getPublic = await app.inject({
      method: 'GET',
      url: `/service-orders/${order.id}`,
    })
    expect(getPublic.statusCode).toBe(200)
    expect(getPublic.json<{ id: string }>().id).toBe(order.id)

    const stats = await app.inject({
      method: 'GET',
      url: '/service-orders/stats',
      headers: authHeader(token),
    })
    expect(stats.statusCode).toBe(200)
    const body = stats.json<Array<{ serviceId: string; completedOrders: number }>>()
    expect(Array.isArray(body)).toBe(true)
    expect(body.find((s) => s.serviceId === serviceId)?.completedOrders).toBeGreaterThan(0)
  })
})

describe('Service Order — quote rejection flow', () => {
  let app: TestApp
  let token: string

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
    token = await loginAsAdmin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects quote and allows advancing again', async () => {
    const client = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: authHeader(token),
      payload: {
        name: 'Pedro Costa',
        document: '529.982.247-25',
        documentType: 'CPF',
        phone: '11977776666',
      },
    })
    const clientId = client.json<{ id: string }>().id

    const vehicle = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: authHeader(token),
      payload: { licensePlate: 'XYZ9876', brand: 'Honda', model: 'Civic', year: 2020, clientId },
    })
    const vehicleId = vehicle.json<{ id: string }>().id

    const service = await app.inject({
      method: 'POST',
      url: '/services',
      headers: authHeader(token),
      payload: { name: 'Revisão Geral', basePrice: 200.0, estimatedMinutes: 120 },
    })
    const serviceId = service.json<{ id: string }>().id

    const order = await app.inject({
      method: 'POST',
      url: '/service-orders',
      headers: authHeader(token),
      payload: {
        clientId,
        vehicleId,
        problemDescription: 'Revisão completa',
        services: [{ serviceId, quantity: 1 }],
        parts: [],
      },
    })
    const orderId = order.json<{ id: string }>().id

    await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
      payload: {},
    })

    const reject = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/reject`,
      headers: authHeader(token),
      payload: {},
    })
    expect(reject.statusCode).toBe(200)
    expect(reject.json<{ status: string }>().status).toBe('EM_DIAGNOSTICO')

    const advanceAgain = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    expect(advanceAgain.statusCode).toBe(200)
    expect(advanceAgain.json<{ status: string }>().status).toBe('AGUARDANDO_APROVACAO')
  })
})

describe('Service Order — insufficient stock', () => {
  let app: TestApp
  let token: string

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
    token = await loginAsAdmin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 422 when approving with insufficient stock', async () => {
    const client = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: authHeader(token),
      payload: {
        name: 'Ana Lima',
        document: '529.982.247-25',
        documentType: 'CPF',
        phone: '11966665555',
      },
    })
    const clientId = client.json<{ id: string }>().id

    const vehicle = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: authHeader(token),
      payload: { licensePlate: 'DEF5678', brand: 'Ford', model: 'Ka', year: 2019, clientId },
    })
    const vehicleId = vehicle.json<{ id: string }>().id

    const service = await app.inject({
      method: 'POST',
      url: '/services',
      headers: authHeader(token),
      payload: { name: 'Alinhamento', basePrice: 80.0, estimatedMinutes: 30 },
    })
    const serviceId = service.json<{ id: string }>().id

    const part = await app.inject({
      method: 'POST',
      url: '/parts',
      headers: authHeader(token),
      payload: { name: 'Parafuso Especial', unitPrice: 5.0, stockQuantity: 1 },
    })
    const partId = part.json<{ id: string }>().id

    const order = await app.inject({
      method: 'POST',
      url: '/service-orders',
      headers: authHeader(token),
      payload: {
        clientId,
        vehicleId,
        problemDescription: 'Precisa de alinhamento',
        services: [{ serviceId, quantity: 1 }],
        parts: [{ partId, quantity: 5 }], // Needs 5, only 1 in stock
      },
    })
    const orderId = order.json<{ id: string }>().id

    await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
      payload: {},
    })
    await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
      payload: {},
    })

    const approve = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/approve`,
      headers: authHeader(token),
    })

    expect(approve.statusCode).toBe(422)
    expect(approve.json<{ code: string }>().code).toBe('INSUFFICIENT_STOCK')
  })
})
