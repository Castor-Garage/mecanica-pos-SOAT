// Function Serverless de autenticação por CPF (Tech Challenge Fase 3).
//
// Fluxo: API Gateway (HTTP API) recebe POST /auth/cpf e invoca esta Lambda
// via proxy integration. A função:
//   1. valida o formato/dígitos do CPF;
//   2. consulta o cliente no banco gerenciado (mesma tabela `clients` usada
//      pela API principal, ver mecanica-pos-SOAT/prisma/schema.prisma);
//   3. recusa cliente inexistente ou fora do status ATIVO;
//   4. gera um JWT (HS256, mesmo JWT_SECRET da API principal) com
//      { sub: clientId, role: 'client' }, que a API já valida hoje em
//      requireRole('client') (ver auth.middleware.ts).
//
// A resposta segue o mesmo formato do /auth/login de admin ({ token, <entidade> }).
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { isValidCpf, onlyDigits } from './cpf.js'
import { findActiveClientByCpf } from './db.js'
import { signClientToken } from './jwt.js'

const CORS_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': process.env.CORS_ORIGIN ?? '*',
}

function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) }
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  let cpfInput: unknown
  try {
    const body = event.body ? JSON.parse(event.body) : {}
    cpfInput = body.cpf
  } catch {
    return json(400, { message: 'Corpo da requisição inválido: JSON esperado.' })
  }

  if (typeof cpfInput !== 'string' || !isValidCpf(cpfInput)) {
    return json(400, { message: 'CPF inválido.' })
  }

  const cpf = onlyDigits(cpfInput)

  const client = await findActiveClientByCpf(cpf)

  // mesma resposta (404) para "não existe" e "existe mas não é ATIVO" —
  // não revela ao chamador se um CPF está cadastrado quando não pode logar
  if (!client || client.status !== 'ATIVO') {
    return json(404, { message: 'Cliente não encontrado ou inativo.' })
  }

  const token = signClientToken(client.id)

  return json(200, {
    token,
    client: { id: client.id, name: client.name },
  })
}
