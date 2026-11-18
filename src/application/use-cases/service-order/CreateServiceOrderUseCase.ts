import newrelic from 'newrelic'
import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import type { IClientRepository } from '../../../domain/client/repositories/IClientRepository.js'
import type { IVehicleRepository } from '../../../domain/vehicle/repositories/IVehicleRepository.js'
import type { IServiceRepository } from '../../../domain/service/repositories/IServiceRepository.js'
import type { IPartRepository } from '../../../domain/part/repositories/IPartRepository.js'
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/AppError.js'
import type { IMessageBus } from '../../../domain/shared/messaging/IMessageBus.js'
import {
  BILLING_COMMANDS_QUEUE,
  type GerarOrcamentoCommand,
} from '../../../domain/shared/messaging/topics.js'

// No-op usado quando nenhum bus e injetado (ex.: testes existentes que
// instanciam o use case sem o 6o parametro) - ver ADR 0006.
class NullMessageBus implements IMessageBus {
  async publish(): Promise<void> {}
  subscribe(): void {}
}

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
    // Orquestrador da saga (ver ADR 0006): publica GerarOrcamento para o
    // Billing Service gerar seu proprio orcamento (assincrono, em paralelo
    // ao quoteTotalAmount local calculado abaixo). Opcional para nao quebrar
    // instanciacoes existentes que nao se importam com a saga.
    private readonly bus: IMessageBus = new NullMessageBus(),
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

    const resolvedServices: Array<{ serviceId: string; quantity: number; unitPrice: number; description: string }> =
      []
    for (const s of input.services) {
      const service = await this.serviceRepo.findById(s.serviceId)
      if (!service) throw new NotFoundError('Serviço', s.serviceId)
      if (!service.isActive) throw new BusinessRuleError(`Serviço "${service.name}" está inativo`)
      resolvedServices.push({
        serviceId: s.serviceId,
        quantity: s.quantity ?? 1,
        unitPrice: service.basePrice,
        description: service.name,
      })
    }

    const resolvedParts: Array<{ partId: string; quantity: number; unitPrice: number; description: string }> = []
    for (const p of input.parts ?? []) {
      const part = await this.partRepo.findById(p.partId)
      if (!part) throw new NotFoundError('Peça', p.partId)
      if (!part.isActive) throw new BusinessRuleError(`Peça "${part.name}" está inativa`)
      resolvedParts.push({
        partId: p.partId,
        quantity: p.quantity,
        unitPrice: part.unitPrice,
        description: part.name,
      })
    }

    const quoteTotalAmount =
      resolvedServices.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0) +
      resolvedParts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)

    const order = await this.serviceOrderRepo.create({
      clientId: input.clientId,
      vehicleId: input.vehicleId,
      problemDescription: input.problemDescription,
      services: resolvedServices,
      parts: resolvedParts,
      quoteTotalAmount,
    })

    // Atributos pesquisaveis no APM - correlaciona esta requisicao HTTP com o
    // restante da saga (ver sagaConsumer.ts, que tambem marca serviceOrderId).
    newrelic.addCustomAttribute('saga.serviceOrderId', order.id)
    newrelic.addCustomAttribute('saga.commandPublished', 'GerarOrcamento')

    await this.bus.publish<GerarOrcamentoCommand>(BILLING_COMMANDS_QUEUE, {
      type: 'GerarOrcamento',
      serviceOrderId: order.id,
      items: [...resolvedServices, ...resolvedParts].map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    })

    return order
  }
}
