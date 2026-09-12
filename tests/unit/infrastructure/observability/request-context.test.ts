import { describe, it, expect } from 'vitest'
import {
  currentRequestId,
  requestContext,
  resolveRequestId,
} from '../../../../src/infrastructure/observability/request-context.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('resolveRequestId', () => {
  it('keeps the id sent by the caller, including API Gateway ids', () => {
    expect(resolveRequestId('JKJaXmPLvHcESHA=')).toBe('JKJaXmPLvHcESHA=')
    expect(resolveRequestId('3f1c2a9e-7b1d-4c55-9a51-0c4d7e2f8b11')).toBe(
      '3f1c2a9e-7b1d-4c55-9a51-0c4d7e2f8b11',
    )
  })

  it('generates a UUID when the caller sends none', () => {
    expect(resolveRequestId(undefined)).toMatch(UUID)
  })

  it('replaces values that do not look like an id', () => {
    expect(resolveRequestId('a'.repeat(200))).toMatch(UUID)
    expect(resolveRequestId('forged\nlog line')).toMatch(UUID)
    expect(resolveRequestId(['id-1', 'id-2'])).toMatch(UUID)
  })
})

describe('currentRequestId', () => {
  it('returns the id of the request being served, and nothing outside one', () => {
    expect(currentRequestId()).toBeUndefined()
    requestContext.run({ requestId: 'req-1' }, () => {
      expect(currentRequestId()).toBe('req-1')
    })
  })
})
