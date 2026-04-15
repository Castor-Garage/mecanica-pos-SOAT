import { describe, it, expect } from 'vitest'
import { CNPJ } from '../../../../src/domain/client/value-objects/CNPJ.js'
import { ValidationError } from '../../../../src/shared/errors/AppError.js'

describe('CNPJ', () => {
  const VALID_CNPJ = '11.222.333/0001-81'
  const VALID_CNPJ_DIGITS = '11222333000181'

  describe('isValid', () => {
    it('returns true for a valid CNPJ', () => {
      expect(CNPJ.isValid(VALID_CNPJ_DIGITS)).toBe(true)
    })

    it('returns true for CNPJ with formatting', () => {
      expect(CNPJ.isValid(VALID_CNPJ)).toBe(true)
    })

    it('returns false for CNPJ with wrong length', () => {
      expect(CNPJ.isValid('1234567890123')).toBe(false)
      expect(CNPJ.isValid('123456789012345')).toBe(false)
    })

    it('returns false for CNPJ with all same digits', () => {
      expect(CNPJ.isValid('00000000000000')).toBe(false)
      expect(CNPJ.isValid('11111111111111')).toBe(false)
    })

    it('returns false for CNPJ with invalid check digits', () => {
      expect(CNPJ.isValid('11222333000182')).toBe(false)
    })
  })

  describe('create', () => {
    it('creates a CNPJ from raw digits', () => {
      const cnpj = CNPJ.create(VALID_CNPJ_DIGITS)
      expect(cnpj.value).toBe(VALID_CNPJ_DIGITS)
    })

    it('creates a CNPJ stripping formatting', () => {
      const cnpj = CNPJ.create(VALID_CNPJ)
      expect(cnpj.value).toBe(VALID_CNPJ_DIGITS)
    })

    it('throws ValidationError for invalid CNPJ', () => {
      expect(() => CNPJ.create('00000000000000')).toThrow(ValidationError)
    })

    it('throws ValidationError with the invalid value in message', () => {
      expect(() => CNPJ.create('bad')).toThrow('CNPJ inválido')
    })
  })

  describe('format', () => {
    it('formats to XX.XXX.XXX/XXXX-XX', () => {
      const cnpj = CNPJ.create(VALID_CNPJ_DIGITS)
      expect(cnpj.format()).toBe('11.222.333/0001-81')
    })
  })

  describe('equals', () => {
    it('returns true for same CNPJ', () => {
      const a = CNPJ.create(VALID_CNPJ_DIGITS)
      const b = CNPJ.create(VALID_CNPJ)
      expect(a.equals(b)).toBe(true)
    })
  })
})
