import { BusinessRuleError } from '../../../shared/errors/AppError.js'

export enum OSStatus {
  RECEBIDA = 'RECEBIDA',
  EM_DIAGNOSTICO = 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO = 'AGUARDANDO_APROVACAO',
  EM_EXECUCAO = 'EM_EXECUCAO',
  FINALIZADA = 'FINALIZADA',
  ENTREGUE = 'ENTREGUE',
}

const VALID_TRANSITIONS: Record<OSStatus, OSStatus[]> = {
  [OSStatus.RECEBIDA]: [OSStatus.EM_DIAGNOSTICO],
  [OSStatus.EM_DIAGNOSTICO]: [OSStatus.AGUARDANDO_APROVACAO],
  [OSStatus.AGUARDANDO_APROVACAO]: [OSStatus.EM_EXECUCAO],
  [OSStatus.EM_EXECUCAO]: [OSStatus.FINALIZADA],
  [OSStatus.FINALIZADA]: [OSStatus.ENTREGUE],
  [OSStatus.ENTREGUE]: [],
}

const STATUS_LABELS: Record<OSStatus, string> = {
  [OSStatus.RECEBIDA]: 'Recebida',
  [OSStatus.EM_DIAGNOSTICO]: 'Em diagnóstico',
  [OSStatus.AGUARDANDO_APROVACAO]: 'Aguardando aprovação',
  [OSStatus.EM_EXECUCAO]: 'Em execução',
  [OSStatus.FINALIZADA]: 'Finalizada',
  [OSStatus.ENTREGUE]: 'Entregue',
}

export function canTransition(from: OSStatus, to: OSStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function assertTransition(from: OSStatus, to: OSStatus): void {
  if (!canTransition(from, to)) {
    throw new BusinessRuleError(
      `Transição inválida: "${STATUS_LABELS[from]}" → "${STATUS_LABELS[to]}". ` +
        `Próximos estados válidos: ${
          VALID_TRANSITIONS[from].map((s) => STATUS_LABELS[s]).join(', ') || 'nenhum (status terminal)'
        }`,
    )
  }
}

export function getValidNextStatuses(current: OSStatus): OSStatus[] {
  return VALID_TRANSITIONS[current]
}

export function statusLabel(status: OSStatus): string {
  return STATUS_LABELS[status]
}
