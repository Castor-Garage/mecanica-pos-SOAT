import '@fastify/jwt'

// admin: e-mail/password login in this API
// client: token issued by the CPF auth Lambda (sub = client id, no e-mail)
type AuthUser = { sub: string; role: 'admin' | 'client'; email?: string }

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser
    user: AuthUser
  }
}
