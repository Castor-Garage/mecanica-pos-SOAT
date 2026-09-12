import { describe, it, expect } from 'vitest'
import { loggerOptions } from '../../../../src/infrastructure/observability/logger.js'

type JsonLoggerOptions = {
  transport?: unknown
  base: Record<string, unknown>
  timestamp: () => string
  formatters: { level: (label: string) => object }
}

describe('loggerOptions', () => {
  it('silences logs in tests', () => {
    expect(loggerOptions('test')).toBe(false)
  })

  it('pretty-prints in development', () => {
    expect(loggerOptions('development')).toMatchObject({ transport: { target: 'pino-pretty' } })
  })

  it('writes JSON with ISO time and a text level anywhere else', () => {
    const options = loggerOptions('production') as JsonLoggerOptions
    expect(options.transport).toBeUndefined()
    expect(options.base).toMatchObject({ service: 'castor-garage-api', env: 'production' })
    expect(options.formatters.level('info')).toEqual({ level: 'info' })
    expect(options.timestamp()).toMatch(/^,"time":"\d{4}-\d{2}-\d{2}T[\d:.]+Z"$/)
  })
})
