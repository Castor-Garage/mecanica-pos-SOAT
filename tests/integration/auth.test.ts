import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, type TestApp } from './helpers.js'

describe('POST /auth/login', () => {
  let app: TestApp

  beforeAll(async () => {
    app = buildTestApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 and a JWT token with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@test.com', password: 'Admin@123' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ token: string; expiresIn: string }>()
    expect(body.token).toBeTruthy()
    expect(body.expiresIn).toBeTruthy()
  })

  it('returns 401 with wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@test.com', password: 'wrong-password' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('returns 401 with unknown email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@test.com', password: 'Admin@123' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('returns 422 when fields are missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@test.com' },
    })

    expect(response.statusCode).toBe(422)
  })

  it('returns 401 when no Authorization header on protected route', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/clients',
    })

    expect(response.statusCode).toBe(401)
  })
})
