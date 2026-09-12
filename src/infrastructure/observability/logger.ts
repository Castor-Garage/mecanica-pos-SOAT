import { hostname } from 'node:os'
import type { FastifyServerOptions } from 'fastify'

// test: silent. development: human-readable. Anything else (production, homolog):
// one JSON object per line, which New Relic/Datadog parse without extra config.
export function loggerOptions(env = process.env.NODE_ENV): FastifyServerOptions['logger'] {
  if (env === 'test') return false

  if (env === 'development') {
    return { transport: { target: 'pino-pretty', options: { colorize: true } } }
  }

  return {
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'castor-garage-api', env, hostname: hostname() },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    formatters: { level: (label: string) => ({ level: label }) },
  }
}
