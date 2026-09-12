import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildTestApp, loginAsAdmin, authHeader, signClientToken, type TestApp } from './helpers.js'

describe('CPF-authenticated client access to service orders', () => {
  let app: TestApp
  let adminToken: string
  let ownerToken: string
  let otherClientToken: string
  let order: { id: string; orderNumber: string }

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
    adminToken = await loginAsAdmin(app)
  })

  afterAll(async () => {
    await app.close()
  })

  async function createClient(name: string, document: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/clients',
      headers: authHeader(adminToken),
      payload: { name, document, documentType: 'CPF', phone: '11999990000' },
    })
    return response.json<{ id: string }>().id
  }

  async function advanceToAwaitingApproval() {
    for (let i = 0; i < 2; i++) {
      await app.inject({
        method: 'POST',
        url: `/service-orders/${order.id}/advance`,
        headers: authHeader(adminToken),
        payload: {},
      })
    }
  }

  // setup.ts truncates the database before each test, so the scenario is rebuilt every time
  beforeEach(async () => {
    const ownerId = await createClient('Maria Souza', '529.982.247-25')
    const otherClientId = await createClient('Pedro Costa', '111.444.777-35')
    ownerToken = signClientToken(app, ownerId)
    otherClientToken = signClientToken(app, otherClientId)

    const vehicle = await app.inject({
      method: 'POST',
      url: '/vehicles',
      headers: authHeader(adminToken),
      payload: { licensePlate: 'ABC1234', brand: 'Toyota', model: 'Corolla', year: 2022, clientId: ownerId },
    })
    const service = await app.inject({
      method: 'POST',
      url: '/services',
      headers: authHeader(adminToken),
      payload: { name: 'Troca de Óleo', basePrice: 120.0, estimatedMinutes: 60 },
    })
    const created = await app.inject({
      method: 'POST',
      url: '/service-orders',
      headers: authHeader(adminToken),
      payload: {
        clientId: ownerId,
        vehicleId: vehicle.json<{ id: string }>().id,
        services: [{ serviceId: service.json<{ id: string }>().id }],
      },
    })
    order = created.json<{ id: string; orderNumber: string }>()
  })

  describe('GET /service-orders/:id', () => {
    it('returns 401 without token', async () => {
      const response = await app.inject({ method: 'GET', url: `/service-orders/${order.id}` })
      expect(response.statusCode).toBe(401)
    })

    it('returns the order to its owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/service-orders/${order.id}`,
        headers: authHeader(ownerToken),
      })
      expect(response.statusCode).toBe(200)
      expect(response.json<{ id: string }>().id).toBe(order.id)
    })

    it('returns 404 to another client', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/service-orders/${order.id}`,
        headers: authHeader(otherClientToken),
      })
      expect(response.statusCode).toBe(404)
    })
  })

  describe('GET /service-orders/track/:orderNumber', () => {
    it('returns the order to its owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/service-orders/track/${order.orderNumber}`,
        headers: authHeader(ownerToken),
      })
      expect(response.statusCode).toBe(200)
      expect(response.json<{ orderNumber: string }>().orderNumber).toBe(order.orderNumber)
    })

    it('answers another client the same way as a missing order', async () => {
      const otherClient = await app.inject({
        method: 'GET',
        url: `/service-orders/track/${order.orderNumber}`,
        headers: authHeader(otherClientToken),
      })
      const missing = await app.inject({
        method: 'GET',
        url: '/service-orders/track/OS-2099-99999',
        headers: authHeader(otherClientToken),
      })
      expect(otherClient.statusCode).toBe(404)
      expect(missing.statusCode).toBe(404)
      expect(otherClient.json<{ code: string }>().code).toBe(missing.json<{ code: string }>().code)
    })
  })

  describe('POST /service-orders/track/:orderNumber/approve and /reject', () => {
    it('lets the owner approve the quote', async () => {
      await advanceToAwaitingApproval()
      const response = await app.inject({
        method: 'POST',
        url: `/service-orders/track/${order.orderNumber}/approve`,
        headers: authHeader(ownerToken),
      })
      expect(response.statusCode).toBe(200)
      expect(response.json<{ status: string }>().status).toBe('EM_EXECUCAO')
    })

    it('lets the owner reject the quote', async () => {
      await advanceToAwaitingApproval()
      const response = await app.inject({
        method: 'POST',
        url: `/service-orders/track/${order.orderNumber}/reject`,
        headers: authHeader(ownerToken),
      })
      expect(response.statusCode).toBe(200)
      expect(response.json<{ status: string }>().status).toBe('EM_DIAGNOSTICO')
    })

    it('returns 404 to another client', async () => {
      await advanceToAwaitingApproval()
      const response = await app.inject({
        method: 'POST',
        url: `/service-orders/track/${order.orderNumber}/approve`,
        headers: authHeader(otherClientToken),
      })
      expect(response.statusCode).toBe(404)
    })

    it('returns 403 to an admin, who uses /service-orders/:id/approve instead', async () => {
      await advanceToAwaitingApproval()
      const response = await app.inject({
        method: 'POST',
        url: `/service-orders/track/${order.orderNumber}/approve`,
        headers: authHeader(adminToken),
      })
      expect(response.statusCode).toBe(403)
    })
  })

  describe('POST /service-orders/:id/send-email', () => {
    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/service-orders/${order.id}/send-email`,
        payload: { email: 'cliente@email.com' },
      })
      expect(response.statusCode).toBe(401)
    })

    it('returns 404 to another client', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/service-orders/${order.id}/send-email`,
        headers: authHeader(otherClientToken),
        payload: { email: 'cliente@email.com' },
      })
      expect(response.statusCode).toBe(404)
    })
  })

  it('returns 403 when a client token calls an admin route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/clients',
      headers: authHeader(ownerToken),
    })
    expect(response.statusCode).toBe(403)
  })
})
