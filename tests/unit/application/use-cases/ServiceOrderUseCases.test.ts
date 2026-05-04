import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateServiceOrderUseCase } from '../../../../src/application/use-cases/service-order/CreateServiceOrderUseCase.js'
import { GetServiceOrderUseCase } from '../../../../src/application/use-cases/service-order/GetServiceOrderUseCase.js'
import { ListServiceOrdersUseCase } from '../../../../src/application/use-cases/service-order/ListServiceOrdersUseCase.js'
import { AdvanceStatusUseCase } from '../../../../src/application/use-cases/service-order/AdvanceStatusUseCase.js'
import { ApproveQuoteUseCase } from '../../../../src/application/use-cases/service-order/ApproveQuoteUseCase.js'
import { RejectQuoteUseCase } from '../../../../src/application/use-cases/service-order/RejectQuoteUseCase.js'
import { GetServiceStatsUseCase } from '../../../../src/application/use-cases/service-order/GetServiceStatsUseCase.js'
import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
  ServiceOrderRecord,
  ServiceStatRecord,
} from '../../../../src/domain/service-order/repositories/IServiceOrderRepository.js'
import type { IClientRepository, ClientRecord } from '../../../../src/domain/client/repositories/IClientRepository.js'
import type { IVehicleRepository, VehicleRecord } from '../../../../src/domain/vehicle/repositories/IVehicleRepository.js'
import type { IServiceRepository, ServiceRecord } from '../../../../src/domain/service/repositories/IServiceRepository.js'
import type { IPartRepository, PartRecord } from '../../../../src/domain/part/repositories/IPartRepository.js'
import { OSStatus } from '../../../../src/domain/service-order/value-objects/OSStatus.js'
import { NotFoundError, BusinessRuleError } from '../../../../src/shared/errors/AppError.js'

const mockServiceOrderRecord: ServiceOrderFullRecord = {
  id: '1',
  orderNumber: 'OS-001',
  status: OSStatus.AGUARDANDO_APROVACAO,
  clientId: '1',
  vehicleId: '1',
  problemDescription: 'Barulho estranho no motor',
  diagnosis: null,
  quoteTotalAmount: 500.0,
  quoteApprovedAt: null,
  quoteRejectedAt: null,
  startedAt: null,
  completedAt: null,
  deliveredAt: null,
  technicianNotes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  client: {
    id: '1',
    name: 'João Silva',
    document: '52998224725',
    phone: '(11) 99999-9999',
  },
  vehicle: {
    id: '1',
    licensePlate: 'ABC1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
  },
  items: [
    {
      id: '1',
      serviceId: '1',
      serviceName: 'Troca de Óleo',
      quantity: 1,
      unitPrice: 150.0,
    },
  ],
  parts: [
    {
      id: '1',
      partId: '1',
      partName: 'Filtro de Óleo',
      quantity: 1,
      unitPrice: 50.0,
    },
  ],
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

const mockServiceRecord: ServiceRecord = {
  id: '1',
  name: 'Troca de Óleo',
  description: 'Serviço de troca de óleo',
  basePrice: 150.0,
  estimatedMinutes: 30,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

const mockPartRecord: PartRecord = {
  id: '1',
  name: 'Filtro de Óleo',
  description: 'Filtro de óleo',
  unitPrice: 50.0,
  stockQuantity: 100,
  minStock: 10,
  unit: 'un',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('Service Order Use Cases', () => {
  let mockServiceOrderRepo: IServiceOrderRepository
  let mockClientRepo: IClientRepository
  let mockVehicleRepo: IVehicleRepository
  let mockServiceRepo: IServiceRepository
  let mockPartRepo: IPartRepository

  beforeEach(() => {
    mockServiceOrderRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      setTimestamp: vi.fn(),
      approveQuote: vi.fn(),
      rejectQuote: vi.fn(),
      getServiceStats: vi.fn(),
    }

    mockClientRepo = {
      findById: vi.fn(),
      findByDocument: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }

    mockVehicleRepo = {
      findById: vi.fn(),
      findByLicensePlate: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }

    mockServiceRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }

    mockPartRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    }
  })

  describe('CreateServiceOrderUseCase', () => {
    it('should create a service order with valid data', async () => {
      const useCase = new CreateServiceOrderUseCase(
        mockServiceOrderRepo,
        mockClientRepo,
        mockVehicleRepo,
        mockServiceRepo,
        mockPartRepo,
      )

      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)
      vi.mocked(mockServiceRepo.findById).mockResolvedValueOnce(mockServiceRecord)
      vi.mocked(mockPartRepo.findById).mockResolvedValueOnce(mockPartRecord)
      vi.mocked(mockServiceOrderRepo.create).mockResolvedValueOnce(mockServiceOrderRecord)

      const result = await useCase.execute({
        clientId: '1',
        vehicleId: '1',
        problemDescription: 'Barulho estranho no motor',
        services: [{ serviceId: '1', quantity: 1 }],
        parts: [{ partId: '1', quantity: 1 }],
      })

      expect(result.id).toBe('1')
      expect(result.quoteTotalAmount).toBe(500.0)
      expect(mockServiceOrderRepo.create).toHaveBeenCalled()
    })

    it('should throw NotFoundError when client does not exist', async () => {
      const useCase = new CreateServiceOrderUseCase(
        mockServiceOrderRepo,
        mockClientRepo,
        mockVehicleRepo,
        mockServiceRepo,
        mockPartRepo,
      )

      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(null)

      await expect(
        useCase.execute({
          clientId: '999',
          vehicleId: '1',
          services: [{ serviceId: '1' }],
        }),
      ).rejects.toThrow(NotFoundError)

      expect(mockServiceOrderRepo.create).not.toHaveBeenCalled()
    })

    it('should throw NotFoundError when vehicle does not exist', async () => {
      const useCase = new CreateServiceOrderUseCase(
        mockServiceOrderRepo,
        mockClientRepo,
        mockVehicleRepo,
        mockServiceRepo,
        mockPartRepo,
      )

      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(null)

      await expect(
        useCase.execute({
          clientId: '1',
          vehicleId: '999',
          services: [{ serviceId: '1' }],
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw BusinessRuleError when vehicle does not belong to client', async () => {
      const useCase = new CreateServiceOrderUseCase(
        mockServiceOrderRepo,
        mockClientRepo,
        mockVehicleRepo,
        mockServiceRepo,
        mockPartRepo,
      )

      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      const differentClientVehicle = { ...mockVehicleRecord, clientId: '2' }
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(differentClientVehicle)

      await expect(
        useCase.execute({
          clientId: '1',
          vehicleId: '1',
          services: [{ serviceId: '1' }],
        }),
      ).rejects.toThrow(BusinessRuleError)
    })

    it('should throw BusinessRuleError when no services provided', async () => {
      const useCase = new CreateServiceOrderUseCase(
        mockServiceOrderRepo,
        mockClientRepo,
        mockVehicleRepo,
        mockServiceRepo,
        mockPartRepo,
      )

      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)

      await expect(
        useCase.execute({
          clientId: '1',
          vehicleId: '1',
          services: [],
        }),
      ).rejects.toThrow(BusinessRuleError)
    })

    it('should throw NotFoundError when service does not exist', async () => {
      const useCase = new CreateServiceOrderUseCase(
        mockServiceOrderRepo,
        mockClientRepo,
        mockVehicleRepo,
        mockServiceRepo,
        mockPartRepo,
      )

      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)
      vi.mocked(mockServiceRepo.findById).mockResolvedValueOnce(null)

      await expect(
        useCase.execute({
          clientId: '1',
          vehicleId: '1',
          services: [{ serviceId: '999' }],
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw BusinessRuleError when service is inactive', async () => {
      const useCase = new CreateServiceOrderUseCase(
        mockServiceOrderRepo,
        mockClientRepo,
        mockVehicleRepo,
        mockServiceRepo,
        mockPartRepo,
      )

      vi.mocked(mockClientRepo.findById).mockResolvedValueOnce(mockClientRecord)
      vi.mocked(mockVehicleRepo.findById).mockResolvedValueOnce(mockVehicleRecord)
      const inactiveService = { ...mockServiceRecord, isActive: false }
      vi.mocked(mockServiceRepo.findById).mockResolvedValueOnce(inactiveService)

      await expect(
        useCase.execute({
          clientId: '1',
          vehicleId: '1',
          services: [{ serviceId: '1' }],
        }),
      ).rejects.toThrow(BusinessRuleError)
    })
  })

  describe('GetServiceOrderUseCase', () => {
    it('should return a service order by id', async () => {
      const useCase = new GetServiceOrderUseCase(mockServiceOrderRepo)
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(mockServiceOrderRecord)

      const result = await useCase.execute('1')

      expect(result.id).toBe('1')
      expect(result.orderNumber).toBe('OS-001')
      expect(mockServiceOrderRepo.findById).toHaveBeenCalledWith('1')
    })

    it('should throw NotFoundError when service order does not exist', async () => {
      const useCase = new GetServiceOrderUseCase(mockServiceOrderRepo)
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
    })
  })

  describe('ApproveQuoteUseCase', () => {
    it('should approve a quote', async () => {
      const useCase = new ApproveQuoteUseCase(mockServiceOrderRepo)
      const approvedOrder = {
        ...mockServiceOrderRecord,
        quoteApprovedAt: new Date(),
      }
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(mockServiceOrderRecord)
      vi.mocked(mockServiceOrderRepo.approveQuote).mockResolvedValueOnce(approvedOrder)

      const result = await useCase.execute('1')

      expect(result.quoteApprovedAt).toBeTruthy()
      expect(mockServiceOrderRepo.approveQuote).toHaveBeenCalledWith('1', undefined)
    })

    it('should throw NotFoundError when order does not exist', async () => {
      const useCase = new ApproveQuoteUseCase(mockServiceOrderRepo)
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
    })
  })

  describe('RejectQuoteUseCase', () => {
    it('should reject a quote', async () => {
      const useCase = new RejectQuoteUseCase(mockServiceOrderRepo)
      const rejectedOrder = {
        ...mockServiceOrderRecord,
        quoteRejectedAt: new Date(),
      }
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(mockServiceOrderRecord)
      vi.mocked(mockServiceOrderRepo.rejectQuote).mockResolvedValueOnce(rejectedOrder)

      const result = await useCase.execute('1')

      expect(result.quoteRejectedAt).toBeTruthy()
      expect(mockServiceOrderRepo.rejectQuote).toHaveBeenCalledWith('1', undefined)
    })

    it('should throw NotFoundError when order does not exist', async () => {
      const useCase = new RejectQuoteUseCase(mockServiceOrderRepo)
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
    })
  })

  describe('AdvanceStatusUseCase', () => {
    it('should advance service order status', async () => {
      const useCase = new AdvanceStatusUseCase(mockServiceOrderRepo)
      const orderWithRecebidaStatus = { ...mockServiceOrderRecord, status: OSStatus.RECEBIDA }
      const advancedOrder = { ...orderWithRecebidaStatus, status: OSStatus.EM_DIAGNOSTICO }
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(orderWithRecebidaStatus as any)
      vi.mocked(mockServiceOrderRepo.updateStatus).mockResolvedValueOnce(advancedOrder as any)

      const result = await useCase.execute('1')

      expect(result.status).toBe(OSStatus.EM_DIAGNOSTICO)
      expect(mockServiceOrderRepo.findById).toHaveBeenCalledWith('1')
    })

    it('should throw NotFoundError when order does not exist', async () => {
      const useCase = new AdvanceStatusUseCase(mockServiceOrderRepo)
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(null)

      await expect(useCase.execute('999')).rejects.toThrow(NotFoundError)
    })

    it('should throw BusinessRuleError when order is awaiting approval', async () => {
      const useCase = new AdvanceStatusUseCase(mockServiceOrderRepo)
      vi.mocked(mockServiceOrderRepo.findById).mockResolvedValueOnce(mockServiceOrderRecord as any)

      await expect(useCase.execute('1')).rejects.toThrow(BusinessRuleError)
    })
  })

  describe('GetServiceStatsUseCase', () => {
    it('should return service statistics', async () => {
      const useCase = new GetServiceStatsUseCase(mockServiceOrderRepo)
      const stats: ServiceStatRecord[] = [
        {
          serviceId: '1',
          serviceName: 'Troca de Óleo',
          completedOrders: 5,
          avgExecutionMinutes: 35,
        },
      ]
      vi.mocked(mockServiceOrderRepo.getServiceStats).mockResolvedValueOnce(stats)

      const result = await useCase.execute()

      expect(result).toHaveLength(1)
      expect(result[0].serviceName).toBe('Troca de Óleo')
      expect(result[0].completedOrders).toBe(5)
      expect(mockServiceOrderRepo.getServiceStats).toHaveBeenCalled()
    })

    it('should return empty array when no stats available', async () => {
      const useCase = new GetServiceStatsUseCase(mockServiceOrderRepo)
      vi.mocked(mockServiceOrderRepo.getServiceStats).mockResolvedValueOnce([])

      const result = await useCase.execute()

      expect(result).toHaveLength(0)
    })
  })
})
