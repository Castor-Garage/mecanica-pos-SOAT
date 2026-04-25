import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, loginAsAdmin, authHeader, type TestApp } from './helpers.js'

describe('Catalog delete endpoints', () => {
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

  it('soft-deletes a service and blocks future get/update', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/services',
      headers: authHeader(token),
      payload: {
        name: 'Balanceamento',
        basePrice: 89.9,
        estimatedMinutes: 40,
      },
    })
    expect(create.statusCode).toBe(201)
    const { id } = create.json<{ id: string }>()

    const del = await app.inject({
      method: 'DELETE',
      url: `/services/${id}`,
      headers: authHeader(token),
    })
    expect(del.statusCode).toBe(204)

    const getAfterDelete = await app.inject({
      method: 'GET',
      url: `/services/${id}`,
      headers: authHeader(token),
    })
    expect(getAfterDelete.statusCode).toBe(404)

    const updateAfterDelete = await app.inject({
      method: 'PUT',
      url: `/services/${id}`,
      headers: authHeader(token),
      payload: { basePrice: 99.9 },
    })
    expect(updateAfterDelete.statusCode).toBe(404)
  })

  it('soft-deletes a part and blocks future get/update', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/parts',
      headers: authHeader(token),
      payload: {
        name: 'Filtro de ar',
        unitPrice: 35.5,
        stockQuantity: 12,
      },
    })
    expect(create.statusCode).toBe(201)
    const { id } = create.json<{ id: string }>()

    const del = await app.inject({
      method: 'DELETE',
      url: `/parts/${id}`,
      headers: authHeader(token),
    })
    expect(del.statusCode).toBe(204)

    const getAfterDelete = await app.inject({
      method: 'GET',
      url: `/parts/${id}`,
      headers: authHeader(token),
    })
    expect(getAfterDelete.statusCode).toBe(404)

    const updateAfterDelete = await app.inject({
      method: 'PUT',
      url: `/parts/${id}`,
      headers: authHeader(token),
      payload: { unitPrice: 40.0 },
    })
    expect(updateAfterDelete.statusCode).toBe(404)
  })
})
