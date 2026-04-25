import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import type { IClientRepository } from '../../../domain/client/repositories/IClientRepository.js'
import type { IVehicleRepository } from '../../../domain/vehicle/repositories/IVehicleRepository.js'
import type { IServiceRepository } from '../../../domain/service/repositories/IServiceRepository.js'
import type { IPartRepository } from '../../../domain/part/repositories/IPartRepository.js'
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/AppError.js'

export interface CreateServiceOrderInput {
  clientId: string
  vehicleId: string
  problemDescription?: string
  services: Array<{ serviceId: string; quantity?: number }>
  parts?: Array<{ partId: string; quantity: number }>
}

export class CreateServiceOrderUseCase {
  constructor(
    private readonly serviceOrderRepo: IServiceOrderRepository,
    private readonly clientRepo: IClientRepository,
    private readonly vehicleRepo: IVehicleRepository,
    private readonly serviceRepo: IServiceRepository,
    private readonly partRepo: IPartRepository,
  ) {}

  async execute(input: CreateServiceOrderInput): Promise<ServiceOrderFullRecord> {
    const client = await this.clientRepo.findById(input.clientId)
    if (!client || client.deletedAt) {
      throw new NotFoundError('Cliente', input.clientId)
    }

    const vehicle = await this.vehicleRepo.findById(input.vehicleId)
    if (!vehicle || vehicle.deletedAt) {
      throw new NotFoundError('Veículo', input.vehicleId)
    }
    if (vehicle.clientId !== input.clientId) {
      throw new BusinessRuleError('O veículo não pertence ao cliente informado')
    }

    if (!input.services || input.services.length === 0) {
      throw new BusinessRuleError('A ordem de serviço deve ter ao menos um serviço')
    }

    const resolvedServices: Array<{ serviceId: string; quantity: number; unitPrice: number }> = []
    for (const s of input.services) {
      const service = await this.serviceRepo.findById(s.serviceId)
      if (!service) throw new NotFoundError('Serviço', s.serviceId)
      if (!service.isActive) throw new BusinessRuleError(`Serviço "${service.name}" está inativo`)
      resolvedServices.push({
        serviceId: s.serviceId,
        quantity: s.quantity ?? 1,
        unitPrice: service.basePrice,
      })
    }

    const resolvedParts: Array<{ partId: string; quantity: number; unitPrice: number }> = []
    for (const p of input.parts ?? []) {
      const part = await this.partRepo.findById(p.partId)
      if (!part) throw new NotFoundError('Peça', p.partId)
      if (!part.isActive) throw new BusinessRuleError(`Peça "${part.name}" está inativa`)
      resolvedParts.push({
        partId: p.partId,
        quantity: p.quantity,
        unitPrice: part.unitPrice,
      })
    }

    const quoteTotalAmount =
      resolvedServices.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0) +
      resolvedParts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)

    return this.serviceOrderRepo.create({
      clientId: input.clientId,
      vehicleId: input.vehicleId,
      problemDescription: input.problemDescription,
      services: resolvedServices,
      parts: resolvedParts,
      quoteTotalAmount,
    })
  }
}
