import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateServiceUseCase } from '../../../../src/application/use-cases/service/CreateServiceUseCase.js'
import { GetServiceUseCase } from '../../../../src/application/use-cases/service/GetServiceUseCase.js'
import { ListServicesUseCase } from '../../../../src/application/use-cases/service/ListServicesUseCase.js'
import { UpdateServiceUseCase } from '../../../../src/application/use-cases/service/UpdateServiceUseCase.js'
import { DeleteServiceUseCase } from '../../../../src/application/use-cases/service/DeleteServiceUseCase.js'
import type {
  IServiceRepository,
  ServiceRecord,
} from '../../../../src/domain/service/repositories/IServiceRepository.js'
import { NotFoundError } from '../../../../src/shared/errors/AppError.js'

const mockServiceRecord: ServiceRecord = {
  id: '1',
  name: 'Troca de Óleo',
  description: 'Serviço de troca de óleo do motor',
  basePrice: 150.0,
  estimatedMinutes: 30,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('Service Use Cases', () => {
  let mockRepository: IServiceRepository

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }
  })

  describe('CreateServiceUseCase', () => {
    it('should create a service', async () => {
      const useCase = new CreateServiceUseCase(mockRepository)
      vi.mocked(mockRepository.create).mockResolvedValueOnce(mockServiceRecord)

      const result = await useCase.execute({
        name: 'Troca de Óleo',
        description: 'Serviço de troca de óleo do motor',
        basePrice: 150.0,
        estimatedMinutes: 30,
      })

      expect(result.id).toBe('1')
      expect(result.name).toBe('Troca de Óleo')
      expect(result.basePrice).toBe(150.0)
      expect(result.estimatedMinutes).toBe(30)
      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('should create a service with minimal data', async () => {
      const useCase = new CreateServiceUseCase(mockRepository)
      vi.mocked(mockRepository.create).mockResolvedValueOnce(mockServiceRecord)

      const result = await useCase.execute({
        name: 'Troca de Óleo',
        basePrice: 150.0,
        estimatedMinutes: 30,
      })

      expect(result.name).toBe('Troca de Óleo')
      expect(mockRepository.create).toHaveBeenCalled()
    })
  })

  describe('GetServiceUseCase', () => {
    it('should return a service by id', async () => {
      const useCase = new GetServiceUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockServiceRecord)

      const result = await useCase.execute('1')

      expect(result.id).toBe('1')
      expect(result.name).toBe('Troca de Óleo')
      expect(mockRepository.findById).toHaveBeenCalledWith('1')
    })

    it('should throw NotFoundError when service does not exist', async () => {
      const useCase = new GetServiceUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
    })
  })

  describe('UpdateServiceUseCase', () => {
    it('should update service data', async () => {
      const useCase = new UpdateServiceUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockServiceRecord)
      const updatedService = { ...mockServiceRecord, basePrice: 200.0 }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedService)

      const result = await useCase.execute('1', { basePrice: 200.0 })

      expect(result.basePrice).toBe(200.0)
      expect(mockRepository.findById).toHaveBeenCalledWith('1')
      expect(mockRepository.update).toHaveBeenCalledWith('1', { basePrice: 200.0 })
    })

    it('should update multiple fields', async () => {
      const useCase = new UpdateServiceUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockServiceRecord)
      const updatedService = {
        ...mockServiceRecord,
        name: 'Troca de Óleo Premium',
        basePrice: 250.0,
        estimatedMinutes: 45,
      }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedService)

      const result = await useCase.execute('1', {
        name: 'Troca de Óleo Premium',
        basePrice: 250.0,
        estimatedMinutes: 45,
      })

      expect(result.name).toBe('Troca de Óleo Premium')
      expect(result.basePrice).toBe(250.0)
      expect(result.estimatedMinutes).toBe(45)
    })

    it('should toggle active status', async () => {
      const useCase = new UpdateServiceUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockServiceRecord)
      const updatedService = { ...mockServiceRecord, isActive: false }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedService)

      const result = await useCase.execute('1', { isActive: false })

      expect(result.isActive).toBe(false)
    })
  })

  describe('DeleteServiceUseCase', () => {
    it('should soft delete a service', async () => {
      const useCase = new DeleteServiceUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockServiceRecord)
      vi.mocked(mockRepository.softDelete).mockResolvedValueOnce(undefined)

      await useCase.execute('1')

      expect(mockRepository.findById).toHaveBeenCalledWith('1')
      expect(mockRepository.softDelete).toHaveBeenCalledWith('1')
    })
  })
})
