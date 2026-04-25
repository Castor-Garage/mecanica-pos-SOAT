import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, loginAsAdmin, authHeader, type TestApp } from './helpers.js'

describe('Service Order full workflow', () => {
  let app: TestApp
  let token: string

  // IDs shared across the test suite
  let clientId: string
  let vehicleId: string
  let serviceId: string
  let partId: string
  let orderId: string

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
    token = await loginAsAdmin(app)

    // Seed prerequisite data (runs after global truncate in setup.ts beforeEach
    // but beforeAll runs once — so we seed here and rely on the truncate from
    // the outer beforeEach running BEFORE this beforeAll)
    const client = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: authHeader(token),
      payload: { name: 'Maria Souza', document: '529.982.247-25', phone: '11999990000' },
    })
    clientId = client.json<{ id: string }>().id

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
    vehicleId = vehicle.json<{ id: string }>().id

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
    serviceId = service.json<{ id: string }>().id

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
    partId = part.json<{ id: string }>().id
  })

  afterAll(async () => {
    await app.close()
  })

  it('1. creates a service order', async () => {
    const response = await app.inject({
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

    expect(response.statusCode).toBe(201)
    const body = response.json<{
      id: string
      status: string
      quoteTotalAmount: number
      orderNumber: string
    }>()
    expect(body.id).toBeTruthy()
    expect(body.status).toBe('RECEBIDA')
    expect(body.orderNumber).toMatch(/^OS-\d{4}-\d{5}$/)
    // quoteTotalAmount = (120 * 1) + (45 * 2) = 210
    expect(body.quoteTotalAmount).toBe(210)
    orderId = body.id
  })

  it('2. advances to EM_DIAGNOSTICO', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('EM_DIAGNOSTICO')
  })

  it('3. advances to AGUARDANDO_APROVACAO', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('AGUARDANDO_APROVACAO')
  })

  it('3b. blocks /advance when status is AGUARDANDO_APROVACAO', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(422)
  })

  it('4. approves quote → EM_EXECUCAO and deducts stock', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/approve`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ status: string; quoteApprovedAt: string }>()
    expect(body.status).toBe('EM_EXECUCAO')
    expect(body.quoteApprovedAt).toBeTruthy()

    // Verify stock was decremented (started at 10, used 2)
    const partResponse = await app.inject({
      method: 'GET',
      url: `/parts/${partId}`,
      headers: authHeader(token),
    })
    expect(partResponse.json<{ stockQuantity: number }>().stockQuantity).toBe(8)
  })

  it('5. advances to FINALIZADA', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('FINALIZADA')
  })

  it('6. advances to ENTREGUE', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('ENTREGUE')
  })

  it('7. ENTREGUE is terminal — /advance returns 422', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(422)
  })

  it('8. GET /service-orders/:id is public', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/service-orders/${orderId}`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ id: string }>().id).toBe(orderId)
  })

  it('9. GET /service-orders/stats returns service stats', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/service-orders/stats',
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<Array<{ serviceId: string; completedOrders: number }>>()
    expect(Array.isArray(body)).toBe(true)
    expect(body.find((s) => s.serviceId === serviceId)?.completedOrders).toBeGreaterThan(0)
  })
})

describe('Service Order — quote rejection flow', () => {
  let app: TestApp
  let token: string
  let orderId: string

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
    token = await loginAsAdmin(app)

    // Seed
    const client = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: authHeader(token),
      payload: { name: 'Pedro Costa', document: '111.444.777-35', phone: '11977776666' },
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
    orderId = order.json<{ id: string }>().id

    // Advance to AGUARDANDO_APROVACAO
    await app.inject({ method: 'POST', url: `/service-orders/${orderId}/advance`, headers: authHeader(token) })
    await app.inject({ method: 'POST', url: `/service-orders/${orderId}/advance`, headers: authHeader(token) })
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects quote → status goes back to EM_DIAGNOSTICO', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/reject`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ status: string; quoteRejectedAt: string }>()
    expect(body.status).toBe('EM_DIAGNOSTICO')
    expect(body.quoteRejectedAt).toBeTruthy()
  })

  it('can advance again after rejection', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/advance`,
      headers: authHeader(token),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ status: string }>().status).toBe('AGUARDANDO_APROVACAO')
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
      payload: { name: 'Ana Lima', document: '853.513.468-93', phone: '11966665555' },
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

    await app.inject({ method: 'POST', url: `/service-orders/${orderId}/advance`, headers: authHeader(token) })
    await app.inject({ method: 'POST', url: `/service-orders/${orderId}/advance`, headers: authHeader(token) })

    const approve = await app.inject({
      method: 'POST',
      url: `/service-orders/${orderId}/approve`,
      headers: authHeader(token),
    })

    expect(approve.statusCode).toBe(422)
    expect(approve.json<{ code: string }>().code).toBe('INSUFFICIENT_STOCK')
  })
})
