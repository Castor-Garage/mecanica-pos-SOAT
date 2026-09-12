// Assina um token compatível com o que a API principal espera de
// @fastify/jwt: HS256, mesmo JWT_SECRET, payload { sub, role, email? }
// (ver mecanica-pos-SOAT/src/shared/types/jwt.d.ts). A API não sabe (nem
// precisa saber) que esse token veio de uma Lambda — só verifica assinatura
// e formato do payload.
import jwt, { type SignOptions } from 'jsonwebtoken'

export type ClientTokenPayload = {
  sub: string
  role: 'client'
}

export function signClientToken(clientId: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET não configurado na Lambda')
  }

  const payload: ClientTokenPayload = { sub: clientId, role: 'client' }

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'],
  }

  return jwt.sign(payload, secret, options)
}
