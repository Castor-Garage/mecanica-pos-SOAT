import type { FastifyRequest } from 'fastify'
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../../shared/errors/AppError.js'

type AuthUser = FastifyRequest['user']

export function requireRole(...roles: AuthUser['role'][]) {
  return async function (request: FastifyRequest): Promise<void> {
    try {
      await request.jwtVerify()
    } catch {
      throw new UnauthorizedError('Token inválido ou expirado')
    }

    // tokens issued before roles existed carry no role: force a new login
    if (!request.user.role) {
      throw new UnauthorizedError('Token inválido ou expirado')
    }

    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError('Acesso não permitido para este perfil')
    }
  }
}

export const requireAdmin = requireRole('admin')

// A CPF-authenticated client only sees its own orders. Someone else's order gets
// the same 404 as a missing one, so the response doesn't reveal that it exists.
export function assertOrderAccess<T extends { clientId: string }>(
  order: T | null,
  user: AuthUser,
  identifier: string,
): T {
  if (!order || (user.role === 'client' && order.clientId !== user.sub)) {
    throw new NotFoundError('Ordem de Serviço', identifier)
  }
  return order
}
