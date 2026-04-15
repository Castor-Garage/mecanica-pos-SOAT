import { describe, it, expect } from 'vitest'
import {
  OSStatus,
  canTransition,
  assertTransition,
  getValidNextStatuses,
} from '../../../../src/domain/service-order/value-objects/OSStatus.js'
import { BusinessRuleError } from '../../../../src/shared/errors/AppError.js'

describe('OSStatus transitions', () => {
  describe('canTransition', () => {
    it('allows forward transitions in the flow', () => {
      expect(canTransition(OSStatus.RECEBIDA, OSStatus.EM_DIAGNOSTICO)).toBe(true)
      expect(canTransition(OSStatus.EM_DIAGNOSTICO, OSStatus.AGUARDANDO_APROVACAO)).toBe(true)
      expect(canTransition(OSStatus.AGUARDANDO_APROVACAO, OSStatus.EM_EXECUCAO)).toBe(true)
      expect(canTransition(OSStatus.EM_EXECUCAO, OSStatus.FINALIZADA)).toBe(true)
      expect(canTransition(OSStatus.FINALIZADA, OSStatus.ENTREGUE)).toBe(true)
    })

    it('rejects backward transitions', () => {
      expect(canTransition(OSStatus.EM_DIAGNOSTICO, OSStatus.RECEBIDA)).toBe(false)
      expect(canTransition(OSStatus.EM_EXECUCAO, OSStatus.AGUARDANDO_APROVACAO)).toBe(false)
      expect(canTransition(OSStatus.FINALIZADA, OSStatus.EM_EXECUCAO)).toBe(false)
    })

    it('rejects skipping states', () => {
      expect(canTransition(OSStatus.RECEBIDA, OSStatus.EM_EXECUCAO)).toBe(false)
      expect(canTransition(OSStatus.RECEBIDA, OSStatus.ENTREGUE)).toBe(false)
    })

    it('ENTREGUE is terminal - no transitions allowed', () => {
      for (const status of Object.values(OSStatus)) {
        expect(canTransition(OSStatus.ENTREGUE, status as OSStatus)).toBe(false)
      }
    })
  })

  describe('assertTransition', () => {
    it('does not throw for valid transition', () => {
      expect(() =>
        assertTransition(OSStatus.RECEBIDA, OSStatus.EM_DIAGNOSTICO),
      ).not.toThrow()
    })

    it('throws BusinessRuleError for invalid transition', () => {
      expect(() =>
        assertTransition(OSStatus.RECEBIDA, OSStatus.ENTREGUE),
      ).toThrow(BusinessRuleError)
    })

    it('throws BusinessRuleError when status is terminal', () => {
      expect(() =>
        assertTransition(OSStatus.ENTREGUE, OSStatus.FINALIZADA),
      ).toThrow(BusinessRuleError)
    })

    it('error message mentions current and target status labels', () => {
      expect(() =>
        assertTransition(OSStatus.RECEBIDA, OSStatus.ENTREGUE),
      ).toThrow(/Recebida/)
    })
  })

  describe('getValidNextStatuses', () => {
    it('returns next statuses for each state', () => {
      expect(getValidNextStatuses(OSStatus.RECEBIDA)).toEqual([OSStatus.EM_DIAGNOSTICO])
      expect(getValidNextStatuses(OSStatus.FINALIZADA)).toEqual([OSStatus.ENTREGUE])
    })

    it('returns empty array for terminal status', () => {
      expect(getValidNextStatuses(OSStatus.ENTREGUE)).toEqual([])
    })
  })
})
