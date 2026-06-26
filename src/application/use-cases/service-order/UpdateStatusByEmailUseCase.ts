import type { IServiceOrderRepository } from '../../../domain/service-order/repositories/IServiceOrderRepository.js'
import { OSStatus, getValidNextStatuses } from '../../../domain/service-order/value-objects/OSStatus.js'
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/AppError.js'

export interface EmailInput {
  subject: string
  body: string
  from: string
}

export interface EmailUpdateResult {
  message: string
  orderNumber: string
}

export class UpdateStatusByEmailUseCase {
  constructor(private readonly serviceOrderRepo: IServiceOrderRepository) {}

  async execute(input: EmailInput): Promise<EmailUpdateResult> {
    const text = `${input.subject} ${input.body}`.toUpperCase()

    const match = text.match(/OS-\d{4}-\d{5}/)
    if (!match) {
      throw new BusinessRuleError(
        'Nenhum número de OS encontrado no e-mail (formato esperado: OS-YYYY-NNNNN)',
      )
    }

    const orderNumber = match[0]
    const order = await this.serviceOrderRepo.findByOrderNumber(orderNumber)
    if (!order) throw new NotFoundError('Ordem de Serviço', orderNumber)

    const isApprove = text.includes('APROVAR') || text.includes('APROVADO')
    const isReject =
      text.includes('REJEITAR') ||
      text.includes('REJEITADO') ||
      text.includes('RECUSAR') ||
      text.includes('RECUSADO')
    const isAdvance = text.includes('AVAN') // AVANÇAR / AVANCAR

    if (isApprove) {
      if (order.status !== OSStatus.AGUARDANDO_APROVACAO) {
        throw new BusinessRuleError(
          `OS ${orderNumber} não está aguardando aprovação (status atual: ${order.status})`,
        )
      }
      await this.serviceOrderRepo.approveQuote(order.id, input.from)
      return { message: `Orçamento da OS ${orderNumber} aprovado com sucesso`, orderNumber }
    }

    if (isReject) {
      if (order.status !== OSStatus.AGUARDANDO_APROVACAO) {
        throw new BusinessRuleError(
          `OS ${orderNumber} não está aguardando aprovação (status atual: ${order.status})`,
        )
      }
      await this.serviceOrderRepo.rejectQuote(order.id, input.from)
      return { message: `Orçamento da OS ${orderNumber} rejeitado`, orderNumber }
    }

    if (isAdvance) {
      if (order.status === OSStatus.AGUARDANDO_APROVACAO) {
        throw new BusinessRuleError(
          `OS ${orderNumber} aguarda decisão do cliente — use APROVAR ou REJEITAR`,
        )
      }
      const next = getValidNextStatuses(order.status)
      if (next.length === 0) {
        throw new BusinessRuleError(`OS ${orderNumber} está em status final e não pode ser avançada`)
      }
      await this.serviceOrderRepo.updateStatus(order.id, next[0], { changedBy: input.from })
      return { message: `Status da OS ${orderNumber} avançado para ${next[0]}`, orderNumber }
    }

    throw new BusinessRuleError(
      'Ação não reconhecida. Use as palavras-chave: APROVAR, REJEITAR ou AVANÇAR no assunto ou corpo do e-mail',
    )
  }
}
