import { describe, it, expect, vi } from 'vitest'
import type { FastifyRequest } from 'fastify'
import {
  requireRole,
  assertOrderAccess,
} from '../../../../src/infrastructure/http/middlewares/auth.middleware.js'
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../../src/shared/errors/AppError.js'

function fakeRequest(user: unknown, tokenValid = true): FastifyRequest {
  return {
    user,
    jwtVerify: tokenValid
      ? vi.fn().mockResolvedValue(undefined)
      : vi.fn().mockRejectedValue(new Error('invalid token')),
  } as unknown as FastifyRequest
}

describe('requireRole', () => {
  it('rejects an invalid or expired token with 401', async () => {
    await expect(requireRole('admin')(fakeRequest(undefined, false))).rejects.toBeInstanceOf(
      UnauthorizedError,
    )
  })

  it('rejects a token issued without role with 401', async () => {
    const request = fakeRequest({ sub: 'admin-1', email: 'admin@oficina.com' })
    await expect(requireRole('admin')(request)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('rejects a role that is not allowed with 403', async () => {
    const request = fakeRequest({ sub: 'client-1', role: 'client' })
    await expect(requireRole('admin')(request)).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('accepts any of the allowed roles', async () => {
    const guard = requireRole('admin', 'client')
    await expect(guard(fakeRequest({ sub: 'admin-1', role: 'admin' }))).resolves.toBeUndefined()
    await expect(guard(fakeRequest({ sub: 'client-1', role: 'client' }))).resolves.toBeUndefined()
  })
})

describe('assertOrderAccess', () => {
  const order = { id: 'order-1', clientId: 'client-1' }

  it('throws 404 when the order does not exist', () => {
    expect(() => assertOrderAccess(null, { sub: 'client-1', role: 'client' }, 'OS-1')).toThrow(
      NotFoundError,
    )
  })

  it('returns the order to its owner', () => {
    expect(assertOrderAccess(order, { sub: 'client-1', role: 'client' }, 'OS-1')).toBe(order)
  })

  it('returns any order to an admin', () => {
    const admin = { sub: 'admin-1', role: 'admin' as const, email: 'admin@oficina.com' }
    expect(assertOrderAccess(order, admin, 'OS-1')).toBe(order)
  })

  it("answers another client's order exactly like a missing one", () => {
    const otherClient = { sub: 'client-2', role: 'client' as const }
    const expected = 'Ordem de Serviço não encontrado (OS-1)'
    expect(() => assertOrderAccess(order, otherClient, 'OS-1')).toThrow(expected)
    expect(() => assertOrderAccess(null, otherClient, 'OS-1')).toThrow(expected)
  })
})
