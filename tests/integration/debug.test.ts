import { it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, loginAsAdmin, authHeader, type TestApp } from './helpers.js'

let app: TestApp
let token: string

beforeAll(async () => {
  app = buildTestApp()
  await app.ready()
  token = await loginAsAdmin(app)
})

afterAll(() => app.close())

it('debug create client - missing documentType', async () => {
  const r = await app.inject({
    method: 'POST', url: '/clients',
    headers: authHeader(token),
    payload: { name: 'João Silva', document: '529.982.247-25', phone: '11999998888' }
  })
  console.log('missing documentType:', r.statusCode, r.body)
})

it('debug create client - with documentType', async () => {
  const r = await app.inject({
    method: 'POST', url: '/clients',
    headers: authHeader(token),
    payload: { name: 'João Silva', document: '529.982.247-25', documentType: 'CPF', phone: '11999998888' }
  })
  console.log('with documentType:', r.statusCode, r.body)
})
