import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, type TestApp } from './helpers.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('Request correlation', () => {
  let app: TestApp

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns the x-request-id sent by the caller', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'gateway-req-123' },
    })
    expect(response.headers['x-request-id']).toBe('gateway-req-123')
  })

  it('generates a request id when the caller sends none', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.headers['x-request-id']).toMatch(UUID)
  })

  it('returns the request id on error responses too', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/clients',
      headers: { 'x-request-id': 'gateway-req-456' },
    })
    expect(response.statusCode).toBe(401)
    expect(response.headers['x-request-id']).toBe('gateway-req-456')
  })
})
