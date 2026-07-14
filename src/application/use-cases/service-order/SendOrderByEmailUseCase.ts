import type { IServiceOrderRepository } from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import type { IEmailProvider } from '../../../domain/shared/providers/IEmailProvider.js'
import { statusLabel } from '../../../domain/service-order/value-objects/OSStatus.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

function money(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

export class SendOrderByEmailUseCase {
  constructor(
    private readonly serviceOrderRepo: IServiceOrderRepository,
    private readonly emailProvider: IEmailProvider,
  ) {}

  async execute(orderId: string, toEmail: string): Promise<void> {
    const order = await this.serviceOrderRepo.findById(orderId)
    if (!order) {
      throw new NotFoundError('Ordem de Serviço', orderId)
    }

    const firstName = order.client.name.trim().split(/\s+/)[0]

    const itemsText = order.items.length
      ? order.items.map((i) => `- ${i.serviceName} x${i.quantity}: ${money(i.unitPrice * i.quantity)}`).join('\n')
      : '- nenhum'

    const partsText = order.parts.length
      ? order.parts.map((p) => `- ${p.partName} x${p.quantity}: ${money(p.unitPrice * p.quantity)}`).join('\n')
      : '- nenhuma'

    const text = [
      `Olá, ${firstName}!`,
      '',
      `Segue o resumo da sua Ordem de Serviço ${order.orderNumber}:`,
      '',
      `Status: ${statusLabel(order.status)}`,
      `Veículo: ${order.vehicle.brand} ${order.vehicle.model} (${order.vehicle.licensePlate})`,
      order.problemDescription ? `Problema: ${order.problemDescription}` : null,
      order.diagnosis ? `Diagnóstico: ${order.diagnosis}` : null,
      order.quoteTotalAmount != null ? `Orçamento: ${money(order.quoteTotalAmount)}` : null,
      '',
      'Serviços:',
      itemsText,
      '',
      'Peças:',
      partsText,
      '',
      'Atenciosamente,',
      'Oficina Castor Garage',
    ]
      .filter((line) => line !== null)
      .join('\n')

    await this.emailProvider.send({
      to: toEmail,
      subject: `Sua OS ${order.orderNumber} — Oficina Castor Garage`,
      text,
    })
  }
}
