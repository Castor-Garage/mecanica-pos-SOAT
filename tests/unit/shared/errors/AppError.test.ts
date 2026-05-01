import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
  BusinessRuleError,
  InsufficientStockError,
} from '../../../../src/shared/errors/AppError.js'

describe('AppError', () => {
  describe('AppError', () => {
    it('should create an error with message and default statusCode', () => {
      const error = new AppError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBeUndefined()
      expect(error.name).toBe('AppError')
    })

    it('should create an error with custom statusCode', () => {
      const error = new AppError('Test error', 500)
      expect(error.statusCode).toBe(500)
    })

    it('should create an error with code', () => {
      const error = new AppError('Test error', 500, 'CUSTOM_CODE')
      expect(error.code).toBe('CUSTOM_CODE')
    })

    it('should be an instance of Error', () => {
      const error = new AppError('Test error')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('NotFoundError', () => {
    it('should create a NotFoundError with resource name', () => {
      const error = new NotFoundError('Cliente')
      expect(error.message).toBe('Cliente não encontrado')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.name).toBe('NotFoundError')
    })

    it('should create a NotFoundError with resource and identifier', () => {
      const error = new NotFoundError('Cliente', '123')
      expect(error.message).toBe('Cliente não encontrado (123)')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
    })

    it('should be an instance of AppError', () => {
      const error = new NotFoundError('Cliente')
      expect(error).toBeInstanceOf(AppError)
    })
  })

  describe('ConflictError', () => {
    it('should create a ConflictError', () => {
      const error = new ConflictError('CPF já existe')
      expect(error.message).toBe('CPF já existe')
      expect(error.statusCode).toBe(409)
      expect(error.code).toBe('CONFLICT')
      expect(error.name).toBe('ConflictError')
    })

    it('should be an instance of AppError', () => {
      const error = new ConflictError('test')
      expect(error).toBeInstanceOf(AppError)
    })
  })

  describe('UnauthorizedError', () => {
    it('should create an UnauthorizedError with default message', () => {
      const error = new UnauthorizedError()
      expect(error.message).toBe('Não autorizado')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.name).toBe('UnauthorizedError')
    })

    it('should create an UnauthorizedError with custom message', () => {
      const error = new UnauthorizedError('Credenciais inválidas')
      expect(error.message).toBe('Credenciais inválidas')
      expect(error.statusCode).toBe(401)
    })

    it('should be an instance of AppError', () => {
      const error = new UnauthorizedError()
      expect(error).toBeInstanceOf(AppError)
    })
  })

  describe('ValidationError', () => {
    it('should create a ValidationError', () => {
      const error = new ValidationError('Email inválido')
      expect(error.message).toBe('Email inválido')
      expect(error.statusCode).toBe(422)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.name).toBe('ValidationError')
    })

    it('should be an instance of AppError', () => {
      const error = new ValidationError('test')
      expect(error).toBeInstanceOf(AppError)
    })
  })

  describe('BusinessRuleError', () => {
    it('should create a BusinessRuleError', () => {
      const error = new BusinessRuleError('Não é permitido deletar um cliente com ordens ativas')
      expect(error.message).toBe('Não é permitido deletar um cliente com ordens ativas')
      expect(error.statusCode).toBe(422)
      expect(error.code).toBe('BUSINESS_RULE_VIOLATION')
      expect(error.name).toBe('BusinessRuleError')
    })

    it('should be an instance of AppError', () => {
      const error = new BusinessRuleError('test')
      expect(error).toBeInstanceOf(AppError)
    })
  })

  describe('InsufficientStockError', () => {
    it('should create an InsufficientStockError with correct message', () => {
      const error = new InsufficientStockError('Pneu Premium', 5, 10)
      expect(error.message).toBe(
        'Estoque insuficiente para "Pneu Premium": disponível 5, solicitado 10',
      )
      expect(error.statusCode).toBe(422)
      expect(error.code).toBe('INSUFFICIENT_STOCK')
      expect(error.name).toBe('InsufficientStockError')
    })

    it('should handle part names with special characters', () => {
      const error = new InsufficientStockError('Óleo Sintético 5W-30', 2, 3)
      expect(error.message).toContain('Óleo Sintético 5W-30')
    })

    it('should be an instance of AppError', () => {
      const error = new InsufficientStockError('test', 1, 2)
      expect(error).toBeInstanceOf(AppError)
    })
  })
})
