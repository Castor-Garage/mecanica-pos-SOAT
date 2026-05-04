import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateClientUseCase } from '../../../../src/application/use-cases/client/CreateClientUseCase.js'
import { GetClientUseCase } from '../../../../src/application/use-cases/client/GetClientUseCase.js'
import { ListClientsUseCase } from '../../../../src/application/use-cases/client/ListClientsUseCase.js'
import { UpdateClientUseCase } from '../../../../src/application/use-cases/client/UpdateClientUseCase.js'
import { DeleteClientUseCase } from '../../../../src/application/use-cases/client/DeleteClientUseCase.js'
import type {
  IClientRepository,
  ClientRecord,
} from '../../../../src/domain/client/repositories/IClientRepository.js'
import { ConflictError, NotFoundError } from '../../../../src/shared/errors/AppError.js'

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

describe('Client Use Cases', () => {
  let mockRepository: IClientRepository

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByDocument: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }
  })

  describe('CreateClientUseCase', () => {
    it('should create a client with valid CPF', async () => {
      const useCase = new CreateClientUseCase(mockRepository)
      vi.mocked(mockRepository.findByDocument).mockResolvedValueOnce(null)
      vi.mocked(mockRepository.create).mockResolvedValueOnce(mockClientRecord)

      const result = await useCase.execute({
        name: 'João Silva',
        document: '529.982.247-25',
        documentType: 'CPF',
        phone: '(11) 99999-9999',
        email: 'joao@example.com',
        address: 'Rua A, 123',
      })

      expect(result.id).toBe('1')
      expect(result.name).toBe('João Silva')
      expect(mockRepository.create).toHaveBeenCalled()
      expect(mockRepository.findByDocument).toHaveBeenCalledWith('52998224725')
    })

    it('should throw ConflictError when CPF already exists', async () => {
      const useCase = new CreateClientUseCase(mockRepository)
      vi.mocked(mockRepository.findByDocument).mockResolvedValueOnce(mockClientRecord)

      await expect(
        useCase.execute({
          name: 'João Silva',
          document: '52998224725',
          documentType: 'CPF',
          phone: '(11) 99999-9999',
        }),
      ).rejects.toThrow(ConflictError)

      expect(mockRepository.create).not.toHaveBeenCalled()
    })

    it('should throw error for invalid CPF', async () => {
      const useCase = new CreateClientUseCase(mockRepository)

      await expect(
        useCase.execute({
          name: 'João Silva',
          document: '00000000000',
          documentType: 'CPF',
          phone: '(11) 99999-9999',
        }),
      ).rejects.toThrow()
    })

    it('should create a client with valid CNPJ', async () => {
      const useCase = new CreateClientUseCase(mockRepository)
      const cnpjRecord = { ...mockClientRecord, document: '11222333000181', documentType: 'CNPJ' as const }
      vi.mocked(mockRepository.findByDocument).mockResolvedValueOnce(null)
      vi.mocked(mockRepository.create).mockResolvedValueOnce(cnpjRecord)

      const result = await useCase.execute({
        name: 'Empresa XYZ',
        document: '11.222.333/0001-81',
        documentType: 'CNPJ',
        phone: '(11) 3333-3333',
      })

      expect(result.documentType).toBe('CNPJ')
      expect(mockRepository.findByDocument).toHaveBeenCalledWith('11222333000181')
    })
  })

  describe('GetClientUseCase', () => {
    it('should return a client by id', async () => {
      const useCase = new GetClientUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockClientRecord)

      const result = await useCase.execute('1')

      expect(result.id).toBe('1')
      expect(result.name).toBe('João Silva')
      expect(mockRepository.findById).toHaveBeenCalledWith('1')
    })

    it('should throw NotFoundError when client does not exist', async () => {
      const useCase = new GetClientUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError when client is deleted', async () => {
      const useCase = new GetClientUseCase(mockRepository)
      const deletedClient = { ...mockClientRecord, deletedAt: new Date() }
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(deletedClient)

      await expect(useCase.execute('1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('UpdateClientUseCase', () => {
    it('should update client data', async () => {
      const useCase = new UpdateClientUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockClientRecord)
      const updatedClient = { ...mockClientRecord, name: 'João Silva Updated' }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedClient)

      const result = await useCase.execute('1', { name: 'João Silva Updated' })

      expect(result.name).toBe('João Silva Updated')
      expect(mockRepository.findById).toHaveBeenCalledWith('1')
      expect(mockRepository.update).toHaveBeenCalledWith('1', { name: 'João Silva Updated' })
    })

    it('should update multiple fields', async () => {
      const useCase = new UpdateClientUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockClientRecord)
      const updatedClient = {
        ...mockClientRecord,
        name: 'Novo Nome',
        phone: '(11) 8888-8888',
        email: 'novo@example.com',
      }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedClient)

      const result = await useCase.execute('1', {
        name: 'Novo Nome',
        phone: '(11) 8888-8888',
        email: 'novo@example.com',
      })

      expect(result.name).toBe('Novo Nome')
      expect(result.phone).toBe('(11) 8888-8888')
      expect(result.email).toBe('novo@example.com')
    })

    it('should allow clearing email and address', async () => {
      const useCase = new UpdateClientUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockClientRecord)
      const updatedClient = { ...mockClientRecord, email: null, address: null }
      vi.mocked(mockRepository.update).mockResolvedValueOnce(updatedClient)

      const result = await useCase.execute('1', { email: null, address: null })

      expect(result.email).toBeNull()
      expect(result.address).toBeNull()
    })
  })

  describe('DeleteClientUseCase', () => {
    it('should soft delete a client', async () => {
      const useCase = new DeleteClientUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockRepository.softDelete).mockResolvedValueOnce(undefined)

      await useCase.execute('1')

      expect(mockRepository.findById).toHaveBeenCalledWith('1')
      expect(mockRepository.softDelete).toHaveBeenCalledWith('1')
    })

    it('should throw NotFoundError when client does not exist', async () => {
      const useCase = new DeleteClientUseCase(mockRepository)
      vi.mocked(mockRepository.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
      expect(mockRepository.softDelete).not.toHaveBeenCalled()
    })
  })
})
