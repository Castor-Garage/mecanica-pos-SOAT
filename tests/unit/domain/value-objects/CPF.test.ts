import { describe, it, expect } from 'vitest'
import { CPF } from '../../../../src/domain/client/value-objects/CPF.js'
import { ValidationError } from '../../../../src/shared/errors/AppError.js'

describe('CPF', () => {
  const VALID_CPF = '529.982.247-25'
  const VALID_CPF_DIGITS = '52998224725'

  describe('isValid', () => {
    it('returns true for a valid CPF', () => {
      expect(CPF.isValid(VALID_CPF_DIGITS)).toBe(true)
    })

    it('returns true for CPF with formatting', () => {
      expect(CPF.isValid(VALID_CPF)).toBe(true)
    })

    it('returns false for CPF with wrong length', () => {
      expect(CPF.isValid('1234567890')).toBe(false)
      expect(CPF.isValid('123456789012')).toBe(false)
    })

    it('returns false for CPF with all same digits', () => {
      expect(CPF.isValid('00000000000')).toBe(false)
      expect(CPF.isValid('11111111111')).toBe(false)
      expect(CPF.isValid('99999999999')).toBe(false)
    })

    it('returns false for CPF with invalid check digits', () => {
      expect(CPF.isValid('52998224726')).toBe(false)
      expect(CPF.isValid('12345678901')).toBe(false)
    })
  })

  describe('create', () => {
    it('creates a CPF from raw digits', () => {
      const cpf = CPF.create(VALID_CPF_DIGITS)
      expect(cpf.value).toBe(VALID_CPF_DIGITS)
    })

    it('creates a CPF stripping formatting', () => {
      const cpf = CPF.create(VALID_CPF)
      expect(cpf.value).toBe(VALID_CPF_DIGITS)
    })

    it('throws ValidationError for invalid CPF', () => {
      expect(() => CPF.create('12345678901')).toThrow(ValidationError)
      expect(() => CPF.create('00000000000')).toThrow(ValidationError)
    })

    it('throws ValidationError with the invalid value in message', () => {
      expect(() => CPF.create('bad')).toThrow('CPF inválido')
    })
  })

  describe('format', () => {
    it('formats to XXX.XXX.XXX-XX', () => {
      const cpf = CPF.create(VALID_CPF_DIGITS)
      expect(cpf.format()).toBe('529.982.247-25')
    })
  })

  describe('equals', () => {
    it('returns true for same CPF', () => {
      const a = CPF.create(VALID_CPF_DIGITS)
      const b = CPF.create(VALID_CPF)
      expect(a.equals(b)).toBe(true)
    })

    it('returns false for different CPFs', () => {
      const a = CPF.create(VALID_CPF_DIGITS)
      const b = CPF.create('111.444.777-35')
      expect(a.equals(b)).toBe(false)
    })
  })
})
