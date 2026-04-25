import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, loginAsAdmin, authHeader, type TestApp } from './helpers.js'

describe('Clients API', () => {
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

  const validCpfClient = {
    name: 'João Silva',
    document: '529.982.247-25',
    documentType: 'CPF' as const,
    phone: '11999998888',
    email: 'joao@email.com',
  }

  const validCnpjClient = {
    name: 'Empresa ABC Ltda',
    document: '11.222.333/0001-81',
    documentType: 'CNPJ' as const,
    phone: '1133334444',
    email: 'contato@empresa.com',
  }

  describe('POST /clients', () => {
    it('creates a client with CPF', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: validCpfClient,
      })

      expect(response.statusCode).toBe(201)
      const body = response.json<{ id: string; name: string; document: string }>()
      expect(body.id).toBeTruthy()
      expect(body.name).toBe(validCpfClient.name)
      expect(body.document).toBe('52998224725')
    })

    it('creates a client with CNPJ', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: validCnpjClient,
      })

      expect(response.statusCode).toBe(201)
    })

    it('returns 409 when document already exists', async () => {
      await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: validCpfClient,
      })

      const response = await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: validCpfClient,
      })

      expect(response.statusCode).toBe(409)
    })

    it('returns 422 when document is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: { ...validCpfClient, document: '000.000.000-00' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('returns 401 without token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/clients',
        payload: validCpfClient,
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /clients', () => {
    it('returns paginated list', async () => {
      await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: validCpfClient,
      })

      const response = await app.inject({
        method: 'GET',
        url: '/clients',
        headers: authHeader(token),
      })

      expect(response.statusCode).toBe(200)
      const body = response.json<{ data: unknown[]; meta: { total: number } }>()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBeGreaterThan(0)
      expect(body.meta.total).toBeGreaterThan(0)
    })

    it('supports pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/clients?page=1&perPage=5',
        headers: authHeader(token),
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('GET /clients/:id', () => {
    it('returns the client', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: validCpfClient,
      })
      const { id } = create.json<{ id: string }>()

      const response = await app.inject({
        method: 'GET',
        url: `/clients/${id}`,
        headers: authHeader(token),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ id: string }>().id).toBe(id)
    })

    it('returns 404 for non-existent id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/clients/00000000-0000-0000-0000-000000000000',
        headers: authHeader(token),
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('PUT /clients/:id', () => {
    it('updates the client', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: validCpfClient,
      })
      const { id } = create.json<{ id: string }>()

      const response = await app.inject({
        method: 'PUT',
        url: `/clients/${id}`,
        headers: authHeader(token),
        payload: { name: 'João Atualizado', phone: '11888887777' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json<{ name: string }>().name).toBe('João Atualizado')
    })
  })

  describe('DELETE /clients/:id', () => {
    it('soft-deletes the client', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/clients',
        headers: authHeader(token),
        payload: validCpfClient,
      })
      const { id } = create.json<{ id: string }>()

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/clients/${id}`,
        headers: authHeader(token),
      })
      expect(deleteResponse.statusCode).toBe(204)

      const getResponse = await app.inject({
        method: 'GET',
        url: `/clients/${id}`,
        headers: authHeader(token),
      })
      expect(getResponse.statusCode).toBe(404)
    })
  })
})
