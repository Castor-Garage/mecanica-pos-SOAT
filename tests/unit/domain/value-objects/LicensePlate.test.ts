import { describe, it, expect } from 'vitest'
import { LicensePlate } from '../../../../src/domain/vehicle/value-objects/LicensePlate.js'
import { ValidationError } from '../../../../src/shared/errors/AppError.js'

describe('LicensePlate', () => {
  describe('isValid', () => {
    it('accepts old Brazilian format (ABC-1234)', () => {
      expect(LicensePlate.isValid('ABC-1234')).toBe(true)
      expect(LicensePlate.isValid('ABC1234')).toBe(true)
    })

    it('accepts Mercosul format (ABC1D23)', () => {
      expect(LicensePlate.isValid('ABC1D23')).toBe(true)
      expect(LicensePlate.isValid('abc1d23')).toBe(true)
    })

    it('rejects invalid formats', () => {
      expect(LicensePlate.isValid('AB1234')).toBe(false)
      expect(LicensePlate.isValid('ABCD1234')).toBe(false)
      expect(LicensePlate.isValid('1234ABC')).toBe(false)
      expect(LicensePlate.isValid('')).toBe(false)
      expect(LicensePlate.isValid('ABC12D3')).toBe(false)
    })
  })

  describe('create', () => {
    it('normalizes to uppercase without hyphen', () => {
      const plate = LicensePlate.create('abc-1234')
      expect(plate.value).toBe('ABC1234')
    })

    it('creates from Mercosul format', () => {
      const plate = LicensePlate.create('ABC1D23')
      expect(plate.value).toBe('ABC1D23')
    })

    it('throws ValidationError for invalid plate', () => {
      expect(() => LicensePlate.create('INVALID')).toThrow(ValidationError)
      expect(() => LicensePlate.create('123-ABC')).toThrow(ValidationError)
    })
  })

  describe('isMercosul', () => {
    it('returns true for Mercosul format', () => {
      const plate = LicensePlate.create('ABC1D23')
      expect(plate.isMercosul()).toBe(true)
    })

    it('returns false for old format', () => {
      const plate = LicensePlate.create('ABC-1234')
      expect(plate.isMercosul()).toBe(false)
    })
  })

  describe('format', () => {
    it('formats old format with hyphen', () => {
      const plate = LicensePlate.create('ABC1234')
      expect(plate.format()).toBe('ABC-1234')
    })

    it('returns Mercosul format as-is', () => {
      const plate = LicensePlate.create('ABC1D23')
      expect(plate.format()).toBe('ABC1D23')
    })
  })

  describe('equals', () => {
    it('returns true for same plate regardless of input format', () => {
      const a = LicensePlate.create('ABC-1234')
      const b = LicensePlate.create('ABC1234')
      expect(a.equals(b)).toBe(true)
    })
  })
})
