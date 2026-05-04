import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateVehicleUseCase } from '../../../../src/application/use-cases/vehicle/CreateVehicleUseCase.js'
import { GetVehicleUseCase } from '../../../../src/application/use-cases/vehicle/GetVehicleUseCase.js'
import { ListVehiclesUseCase } from '../../../../src/application/use-cases/vehicle/ListVehiclesUseCase.js'
import { UpdateVehicleUseCase } from '../../../../src/application/use-cases/vehicle/UpdateVehicleUseCase.js'
import { DeleteVehicleUseCase } from '../../../../src/application/use-cases/vehicle/DeleteVehicleUseCase.js'
import type {
  IVehicleRepository,
  VehicleRecord,
} from '../../../../src/domain/vehicle/repositories/IVehicleRepository.js'
import type { IClientRepository, ClientRecord } from '../../../../src/domain/client/repositories/IClientRepository.js'
import { ConflictError, NotFoundError } from '../../../../src/shared/errors/AppError.js'

const mockVehicleRecord: VehicleRecord = {
  id: '1',
  licensePlate: 'ABC1234',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2020,
  color: 'Prata',
  clientId: '1',
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const mockClientRecord: ClientRecord = {
  id: '1',
  name: 'João Silva',
  document: '52998224725',
  documentType: 'CPF',
  phone: '(11) 99999-9999',
  email: 'joao@example.com',
  address: 'Rua A, 123',
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('Vehicle Use Cases', () => {
  let mockVehicleRepo: IVehicleRepository
  let mockClientRepo: IClientRepository

  beforeEach(() => {
    mockVehicleRepo = {
      findById: vi.fn(),
      findByLicensePlate: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }

    mockClientRepo = {
      findById: vi.fn(),
      findByDocument: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }
  })

  describe('CreateVehicleUseCase', () => {
    it('should create a vehicle with valid data', async () => {
      const useCase = new CreateVehicleUseCase(mockVehicleRepo, mockClientRepo)
      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockVehicleRepo.findByLicensePlate).mockResolvedValueOnce(null)
      vi.mocked(mockVehicleRepo.create).mockResolvedValueOnce(mockVehicleRecord)

      const result = await useCase.execute({
        licensePlate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Prata',
        clientId: '1',
      })

      expect(result.id).toBe('1')
      expect(result.brand).toBe('Toyota')
      expect(mockClientRepo.findById).toHaveBeenCalledWith('1')
      expect(mockVehicleRepo.create).toHaveBeenCalled()
    })

    it('should throw NotFoundError when client does not exist', async () => {
      const useCase = new CreateVehicleUseCase(mockVehicleRepo, mockClientRepo)
      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(null)

      await expect(
        useCase.execute({
          licensePlate: 'ABC-1234',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          clientId: '999',
        }),
      ).rejects.toThrow(NotFoundError)

      expect(mockVehicleRepo.create).not.toHaveBeenCalled()
    })

    it('should throw NotFoundError when client is deleted', async () => {
      const useCase = new CreateVehicleUseCase(mockVehicleRepo, mockClientRepo)
      const deletedClient = { ...mockClientRecord, deletedAt: new Date() }
      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(deletedClient)

      await expect(
        useCase.execute({
          licensePlate: 'ABC-1234',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          clientId: '1',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ConflictError when license plate already exists', async () => {
      const useCase = new CreateVehicleUseCase(mockVehicleRepo, mockClientRepo)
      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockVehicleRepo.findByLicensePlate).mockResolvedValueOnce(mockVehicleRecord)

      await expect(
        useCase.execute({
          licensePlate: 'ABC-1234',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
          clientId: '1',
        }),
      ).rejects.toThrow(ConflictError)

      expect(mockVehicleRepo.create).not.toHaveBeenCalled()
    })

    it('should format license plate correctly', async () => {
      const useCase = new CreateVehicleUseCase(mockVehicleRepo, mockClientRepo)
      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockVehicleRepo.findByLicensePlate).mockResolvedValueOnce(null)
      vi.mocked(mockVehicleRepo.create).mockResolvedValueOnce(mockVehicleRecord)

      await useCase.execute({
        licensePlate: 'ABC 1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        clientId: '1',
      })

      expect(mockVehicleRepo.findByLicensePlate).toHaveBeenCalledWith('ABC1234')
    })
  })

  describe('GetVehicleUseCase', () => {
    it('should return a vehicle by id', async () => {
      const useCase = new GetVehicleUseCase(mockVehicleRepo)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)

      const result = await useCase.execute('1')

      expect(result.id).toBe('1')
      expect(result.licensePlate).toBe('ABC1234')
      expect(mockVehicleRepo.findById).toHaveBeenCalledWith('1')
    })

    it('should throw NotFoundError when vehicle does not exist', async () => {
      const useCase = new GetVehicleUseCase(mockVehicleRepo)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError when vehicle is deleted', async () => {
      const useCase = new GetVehicleUseCase(mockVehicleRepo)
      const deletedVehicle = { ...mockVehicleRecord, deletedAt: new Date() }
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(deletedVehicle)

      await expect(useCase.execute('1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('UpdateVehicleUseCase', () => {
    it('should update vehicle data', async () => {
      const useCase = new UpdateVehicleUseCase(mockVehicleRepo)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)
      const updatedVehicle = { ...mockVehicleRecord, brand: 'Honda' }
      vi.mocked(mockVehicleRepo.update).mockResolvedValueOnce(updatedVehicle)

      const result = await useCase.execute('1', { brand: 'Honda' })

      expect(result.brand).toBe('Honda')
      expect(mockVehicleRepo.findById).toHaveBeenCalledWith('1')
      expect(mockVehicleRepo.update).toHaveBeenCalledWith('1', { brand: 'Honda' })
    })

    it('should update multiple fields', async () => {
      const useCase = new UpdateVehicleUseCase(mockVehicleRepo)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)
      const updatedVehicle = {
        ...mockVehicleRecord,
        model: 'Civic',
        year: 2022,
        color: 'Preto',
      }
      vi.mocked(mockVehicleRepo.update).mockResolvedValueOnce(updatedVehicle)

      const result = await useCase.execute('1', {
        model: 'Civic',
        year: 2022,
        color: 'Preto',
      })

      expect(result.model).toBe('Civic')
      expect(result.year).toBe(2022)
      expect(result.color).toBe('Preto')
    })

    it('should allow clearing color', async () => {
      const useCase = new UpdateVehicleUseCase(mockVehicleRepo)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)
      const updatedVehicle = { ...mockVehicleRecord, color: null }
      vi.mocked(mockVehicleRepo.update).mockResolvedValueOnce(updatedVehicle)

      const result = await useCase.execute('1', { color: null })

      expect(result.color).toBeNull()
    })
  })

  describe('DeleteVehicleUseCase', () => {
    it('should soft delete a vehicle', async () => {
      const useCase = new DeleteVehicleUseCase(mockVehicleRepo)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)
      vi.mocked(mockVehicleRepo.softDelete).mockResolvedValueOnce(undefined)

      await useCase.execute('1')

      expect(mockVehicleRepo.findById).toHaveBeenCalledWith('1')
      expect(mockVehicleRepo.softDelete).toHaveBeenCalledWith('1')
    })
  })
})
