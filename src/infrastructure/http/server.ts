import Fastify, { type FastifyError } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { AppError } from '../../shared/errors/AppError.js'
import { ZodError } from 'zod'
import { loggerOptions } from '../observability/logger.js'
import { requestContext, resolveRequestId } from '../observability/request-context.js'
import { BusinessEventLogger } from '../observability/events.js'
import { authRoutes } from './routes/auth.routes.js'
import { clientRoutes } from './routes/client.routes.js'
import { vehicleRoutes } from './routes/vehicle.routes.js'
import { serviceRoutes } from './routes/service.routes.js'
import { partRoutes } from './routes/part.routes.js'
import { serviceOrderRoutes } from './routes/service-order.routes.js'
import { webhookRoutes } from './routes/webhook.routes.js'

const REQUEST_ID_HEADER = 'x-request-id'

export function buildServer() {
  const app = Fastify({
    logger: loggerOptions(),
    // one id per request, reused from the caller (API Gateway, front-end) when sent
    requestIdHeader: false,
    requestIdLogLabel: 'requestId',
    genReqId: (req) => resolveRequestId(req.headers[REQUEST_ID_HEADER]),
  }).withTypeProvider<ZodTypeProvider>()

  const events = new BusinessEventLogger(app.log)

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // return the id to the caller and make it visible to repositories/providers
  app.addHook('onRequest', (request, reply, done) => {
    reply.header(REQUEST_ID_HEADER, request.id)
    requestContext.run({ requestId: request.id }, done)
  })

  // CORS
  app.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  })

  // JWT
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'fallback-dev-secret',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    },
  })

  // Swagger
  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Oficina Mecânica API',
        description:
          'Sistema Integrado de Atendimento e Execução de Serviços - MVP Backend',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  })

  // Routes
  app.register(authRoutes)
  app.register(clientRoutes)
  app.register(vehicleRoutes)
  app.register(serviceRoutes)
  app.register(partRoutes)
  app.register(serviceOrderRoutes)
  app.register(webhookRoutes)

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const route = request.routeOptions.url

    if ('validation' in error && Array.isArray(error.validation)) {
      events.reportFailure(route, 422, error)
      return reply.status(422).send({
        type: 'https://httpstatuses.com/422',
        title: 'Validation Error',
        status: 422,
        detail: 'Os dados fornecidos são inválidos',
        errors: error.validation.map((e) => ({
          field: String(e.instancePath ?? e.schemaPath ?? 'body').replace(/^\//, ''),
          message: e.message,
        })),
      })
    }

    if (error instanceof ZodError) {
      events.reportFailure(route, 422, error)
      return reply.status(422).send({
        type: 'https://httpstatuses.com/422',
        title: 'Validation Error',
        status: 422,
        detail: 'Os dados fornecidos são inválidos',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    if (error instanceof AppError) {
      events.reportFailure(route, error.statusCode, error)
      return reply.status(error.statusCode).send({
        type: `https://httpstatuses.com/${error.statusCode}`,
        title: error.name,
        status: error.statusCode,
        detail: error.message,
        code: error.code,
      })
    }

    request.log.error({ err: error }, 'Unhandled error')
    events.reportFailure(route, 500, error)
    return reply.status(500).send({
      type: 'https://httpstatuses.com/500',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Ocorreu um erro interno no servidor',
    })
  })

  return app
}
