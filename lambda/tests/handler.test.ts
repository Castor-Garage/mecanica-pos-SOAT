import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const findActiveClientByCpf = vi.fn()
const signClientToken = vi.fn()

vi.mock('../src/db.js', () => ({ findActiveClientByCpf }))
vi.mock('../src/jwt.js', () => ({ signClientToken }))

const { handler } = await import('../src/handler.js')

function makeEvent(body: unknown, method = 'POST'): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method } },
    body: body === undefined ? undefined : JSON.stringify(body),
  } as unknown as APIGatewayProxyEventV2
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handler', () => {
  it('responde 204 em preflight OPTIONS', async () => {
    const result = await handler(makeEvent(undefined, 'OPTIONS'))
    expect(result).toMatchObject({ statusCode: 204 })
    expect(findActiveClientByCpf).not.toHaveBeenCalled()
  })

  it('rejeita corpo que não é JSON válido', async () => {
    const event = { requestContext: { http: { method: 'POST' } }, body: '{not-json' }
    const result = await handler(event as unknown as APIGatewayProxyEventV2)
    expect(result.statusCode).toBe(400)
  })

  it('rejeita CPF invalido sem consultar o banco', async () => {
    const result = await handler(makeEvent({ cpf: '111.111.111-11' }))
    expect(result.statusCode).toBe(400)
    expect(findActiveClientByCpf).not.toHaveBeenCalled()
  })

  it('retorna 404 quando o cliente nao existe', async () => {
    findActiveClientByCpf.mockResolvedValue(null)
    const result = await handler(makeEvent({ cpf: '529.982.247-25' }))
    expect(result.statusCode).toBe(404)
  })

  it('retorna 404 quando o cliente existe mas nao esta ATIVO', async () => {
    findActiveClientByCpf.mockResolvedValue({ id: 'c1', name: 'Fulano', status: 'BLOQUEADO' })
    const result = await handler(makeEvent({ cpf: '529.982.247-25' }))
    expect(result.statusCode).toBe(404)
    expect(signClientToken).not.toHaveBeenCalled()
  })

  it('gera token para cliente ATIVO e devolve dados basicos', async () => {
    findActiveClientByCpf.mockResolvedValue({ id: 'c1', name: 'Fulano', status: 'ATIVO' })
    signClientToken.mockReturnValue('jwt-assinado')

    const result = await handler(makeEvent({ cpf: '529.982.247-25' }))

    expect(result.statusCode).toBe(200)
    expect(signClientToken).toHaveBeenCalledWith('c1')
    expect(JSON.parse(result.body as string)).toEqual({
      token: 'jwt-assinado',
      client: { id: 'c1', name: 'Fulano' },
    })
  })
})
