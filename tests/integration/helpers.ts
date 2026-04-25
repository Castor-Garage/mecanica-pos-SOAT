import { buildServer } from '../../src/infrastructure/http/server.js'

export type TestApp = ReturnType<typeof buildServer>

export function buildTestApp(): TestApp {
  return buildServer()
}

export async function loginAsAdmin(app: TestApp): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email: process.env.ADMIN_EMAIL ?? 'admin@test.com',
      password: process.env.ADMIN_PASSWORD ?? 'Admin@123',
    },
  })
  const data = response.json<{ token: string }>()
  return data.token
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}
