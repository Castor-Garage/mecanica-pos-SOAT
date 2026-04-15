import Fastify from 'fastify'
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

export function buildServer() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV !== 'test'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true },
            },
          }
        : false,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // CORS
  app.register(fastifyCors, {
    origin: true,
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

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
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
      return reply.status(error.statusCode).send({
        type: `https://httpstatuses.com/${error.statusCode}`,
        title: error.name,
        status: error.statusCode,
        detail: error.message,
        code: error.code,
      })
    }

    app.log.error(error)
    return reply.status(500).send({
      type: 'https://httpstatuses.com/500',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Ocorreu um erro interno no servidor',
    })
  })

  return app
}
