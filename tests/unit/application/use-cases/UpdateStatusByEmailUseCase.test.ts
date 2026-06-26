import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UpdateStatusByEmailUseCase } from '../../../../src/application/use-cases/service-order/UpdateStatusByEmailUseCase.js'
import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../../src/domain/service-order/repositories/IServiceOrderRepository.js'
import { OSStatus } from '../../../../src/domain/service-order/value-objects/OSStatus.js'
import { NotFoundError, BusinessRuleError } from '../../../../src/shared/errors/AppError.js'

function makeOrder(status: OSStatus): ServiceOrderFullRecord {
  return {
    id: 'order-1',
    orderNumber: 'OS-2025-00001',
    status,
    clientId: 'client-1',
    vehicleId: 'vehicle-1',
    problemDescription: null,
    diagnosis: null,
    quoteTotalAmount: 300,
    quoteApprovedAt: null,
    quoteRejectedAt: null,
    startedAt: null,
    completedAt: null,
    deliveredAt: null,
    technicianNotes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    client: { id: 'c1', name: 'João', document: '123', phone: '99' },
    vehicle: { id: 'v1', licensePlate: 'ABC1234', brand: 'Toyota', model: 'Corolla', year: 2020 },
    items: [],
    parts: [],
  }
}

describe('UpdateStatusByEmailUseCase', () => {
  let repo: IServiceOrderRepository
  let useCase: UpdateStatusByEmailUseCase

  beforeEach(() => {
    repo = {
      findById: vi.fn(),
      findByOrderNumber: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      setTimestamp: vi.fn(),
      approveQuote: vi.fn(),
      rejectQuote: vi.fn(),
      getServiceStats: vi.fn(),
    }
    useCase = new UpdateStatusByEmailUseCase(repo)
  })

  describe('APROVAR', () => {
    it('deve aprovar orçamento quando OS está em AGUARDANDO_APROVACAO', async () => {
      const order = makeOrder(OSStatus.AGUARDANDO_APROVACAO)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)
      vi.mocked(repo.approveQuote).mockResolvedValueOnce({ ...order, quoteApprovedAt: new Date() })

      const result = await useCase.execute({
        subject: 'APROVAR OS-2025-00001',
        body: 'Concordo com o orçamento',
        from: 'cliente@email.com',
      })

      expect(result.orderNumber).toBe('OS-2025-00001')
      expect(repo.approveQuote).toHaveBeenCalledWith('order-1', 'cliente@email.com')
    })

    it('deve lançar BusinessRuleError ao tentar APROVAR OS que não está em AGUARDANDO_APROVACAO', async () => {
      const order = makeOrder(OSStatus.RECEBIDA)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)

      await expect(
        useCase.execute({ subject: 'APROVAR OS-2025-00001', body: '', from: 'cliente@email.com' }),
      ).rejects.toThrow(BusinessRuleError)

      expect(repo.approveQuote).not.toHaveBeenCalled()
    })
  })

  describe('REJEITAR', () => {
    it('deve rejeitar orçamento quando OS está em AGUARDANDO_APROVACAO', async () => {
      const order = makeOrder(OSStatus.AGUARDANDO_APROVACAO)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)
      vi.mocked(repo.rejectQuote).mockResolvedValueOnce({ ...order, quoteRejectedAt: new Date() })

      const result = await useCase.execute({
        subject: 'REJEITAR OS-2025-00001',
        body: 'Preço muito alto',
        from: 'cliente@email.com',
      })

      expect(result.orderNumber).toBe('OS-2025-00001')
      expect(repo.rejectQuote).toHaveBeenCalledWith('order-1', 'cliente@email.com')
    })

    it('também reconhece a palavra RECUSAR', async () => {
      const order = makeOrder(OSStatus.AGUARDANDO_APROVACAO)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)
      vi.mocked(repo.rejectQuote).mockResolvedValueOnce({ ...order, quoteRejectedAt: new Date() })

      await useCase.execute({ subject: 'RECUSAR OS-2025-00001', body: '', from: 'x@y.com' })

      expect(repo.rejectQuote).toHaveBeenCalled()
    })

    it('deve lançar BusinessRuleError ao tentar REJEITAR OS que não está em AGUARDANDO_APROVACAO', async () => {
      const order = makeOrder(OSStatus.EM_EXECUCAO)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)

      await expect(
        useCase.execute({ subject: 'REJEITAR OS-2025-00001', body: '', from: 'x@y.com' }),
      ).rejects.toThrow(BusinessRuleError)
    })
  })

  describe('AVANÇAR', () => {
    it('deve avançar status de RECEBIDA para EM_DIAGNOSTICO', async () => {
      const order = makeOrder(OSStatus.RECEBIDA)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)
      vi.mocked(repo.updateStatus).mockResolvedValueOnce({ ...order, status: OSStatus.EM_DIAGNOSTICO } as never)

      const result = await useCase.execute({
        subject: 'AVANÇAR OS-2025-00001',
        body: '',
        from: 'mecanico@oficina.com',
      })

      expect(result.orderNumber).toBe('OS-2025-00001')
      expect(repo.updateStatus).toHaveBeenCalledWith(
        'order-1',
        OSStatus.EM_DIAGNOSTICO,
        { changedBy: 'mecanico@oficina.com' },
      )
    })

    it('deve lançar BusinessRuleError ao tentar AVANÇAR OS em AGUARDANDO_APROVACAO', async () => {
      const order = makeOrder(OSStatus.AGUARDANDO_APROVACAO)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)

      await expect(
        useCase.execute({ subject: 'AVANÇAR OS-2025-00001', body: '', from: 'x@y.com' }),
      ).rejects.toThrow(BusinessRuleError)

      expect(repo.updateStatus).not.toHaveBeenCalled()
    })

    it('deve lançar BusinessRuleError ao tentar AVANÇAR OS já entregue (status terminal)', async () => {
      const order = makeOrder(OSStatus.ENTREGUE)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)

      await expect(
        useCase.execute({ subject: 'AVANÇAR OS-2025-00001', body: '', from: 'x@y.com' }),
      ).rejects.toThrow(BusinessRuleError)
    })
  })

  describe('Erros gerais', () => {
    it('deve lançar BusinessRuleError quando número de OS não está no e-mail', async () => {
      await expect(
        useCase.execute({ subject: 'Assunto genérico', body: 'Sem número de OS', from: 'x@y.com' }),
      ).rejects.toThrow(BusinessRuleError)

      expect(repo.findByOrderNumber).not.toHaveBeenCalled()
    })

    it('deve lançar NotFoundError quando OS não existe no sistema', async () => {
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(null)

      await expect(
        useCase.execute({ subject: 'APROVAR OS-2025-00001', body: '', from: 'x@y.com' }),
      ).rejects.toThrow(NotFoundError)
    })

    it('deve lançar BusinessRuleError quando ação não é reconhecida', async () => {
      const order = makeOrder(OSStatus.RECEBIDA)
      vi.mocked(repo.findByOrderNumber).mockResolvedValueOnce(order)

      await expect(
        useCase.execute({
          subject: 'Consulta OS-2025-00001',
          body: 'Gostaria de saber o andamento',
          from: 'x@y.com',
        }),
      ).rejects.toThrow(BusinessRuleError)
    })
  })
})
