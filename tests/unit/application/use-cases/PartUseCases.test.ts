import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatePartUseCase } from '../../../../src/application/use-cases/part/CreatePartUseCase.js'
import { GetPartUseCase } from '../../../../src/application/use-cases/part/GetPartUseCase.js'
import { ListPartsUseCase } from '../../../../src/application/use-cases/part/ListPartsUseCase.js'
import { UpdatePartUseCase } from '../../../../src/application/use-cases/part/UpdatePartUseCase.js'
import { DeletePartUseCase } from '../../../../src/application/use-cases/part/DeletePartUseCase.js'
import type {
  IPartRepository,
  PartRecord,
} from '../../../../src/domain/part/repositories/IPartRepository.js'
import { NotFoundError } from '../../../../src/shared/errors/AppError.js'

const mockPartRecord: PartRecord = {
  id: '1',
  name: 'Pneu Premium 175/65',
  description: 'Pneu de alta durabilidade',
  unitPrice: 250.0,
  stockQuantity: 50,
  minStock: 10,
  unit: 'un',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('Part Use Cases', () => {
  let mockRepository: IPartRepository

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }
  })

  describe('CreatePartUseCase', () => {
    it('should create a part', async () => {
      const useCase = new CreatePartUseCase(mockRepository)
      vi.mocked(mockRepository.create).mockResolvedValueOnce(mockPartRecord)

      const result = await useCase.execute({
        name: 'Pneu Premium 175/65',
        description: 'Pneu de alta durabilidade',
        unitPrice: 250.0,
        stockQuantity: 50,
        minStock: 10,
        unit: 'un',
      })

      expect(result.id).toBe('1')
      expect(result.name).toBe('Pneu Premium 175/65')
      expect(result.unitPrice).toBe(250.0)
      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('should create a part with minimal data', async () => {
      const useCase = new CreatePartUseCase(mockRepository)
      vi.mocked(mockRepository.create).mockResolvedValueOnce(mockPartRecord)

      const result = await useCase.execute({
        name: 'Pneu Premium 175/65',
        unitPrice: 250.0,
      })

      expect(result.name).toBe('Pneu Premium 175/65')
      expect(mockRepository.create).toHaveBeenCalled()
    })
  })

  describe('GetPartUseCase', () => {
    it('should return a part by id', async () => {
      const useCase = new GetPartUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockPartRecord)

      const result = await useCase.execute('1')

      expect(result.id).toBe('1')
      expect(result.name).toBe('Pneu Premium 175/65')
      expect(mockRepository.findById).toHaveBeenCalledWith('1')
    })

    it('should throw NotFoundError when part does not exist', async () => {
      const useCase = new GetPartUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
    })
  })

  describe('UpdatePartUseCase', () => {
    it('should update part data', async () => {
      const useCase = new UpdatePartUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockPartRecord)
      const updatedPart = { ...mockPartRecord, unitPrice: 300.0 }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedPart)

      const result = await useCase.execute('1', { unitPrice: 300.0 })

      expect(result.unitPrice).toBe(300.0)
      expect(mockRepository.findById).toHaveBeenCalledWith('1')
      expect(mockRepository.update).toHaveBeenCalledWith('1', { unitPrice: 300.0 })
    })

    it('should update multiple fields', async () => {
      const useCase = new UpdatePartUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockPartRecord)
      const updatedPart = {
        ...mockPartRecord,
        name: 'Pneu Premium Plus',
        stockQuantity: 100,
        minStock: 15,
      }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedPart)

      const result = await useCase.execute('1', {
        name: 'Pneu Premium Plus',
        stockQuantity: 100,
        minStock: 15,
      })

      expect(result.name).toBe('Pneu Premium Plus')
      expect(result.stockQuantity).toBe(100)
      expect(result.minStock).toBe(15)
    })

    it('should toggle active status', async () => {
      const useCase = new UpdatePartUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockPartRecord)
      const updatedPart = { ...mockPartRecord, isActive: false }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedPart)

      const result = await useCase.execute('1', { isActive: false })

      expect(result.isActive).toBe(false)
    })
  })

  describe('DeletePartUseCase', () => {
    it('should soft delete a part', async () => {
      const useCase = new DeletePartUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockPartRecord)
      vi.mocked(mockRepository.softDelete).mockResolvedValueOnce(undefined)

      await useCase.execute('1')

      expect(mockRepository.findById).toHaveBeenCalledWith('1')
      expect(mockRepository.softDelete).toHaveBeenCalledWith('1')
    })
  })
})
