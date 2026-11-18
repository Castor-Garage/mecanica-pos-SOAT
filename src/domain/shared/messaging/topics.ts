// Contrato de mensageria do OS Service (orquestrador da saga - ver ADR 0006).
// Espelha, lado a lado, os contratos definidos em mecanica-billing-SOAT e
// mecanica-execucao-SOAT - qualquer mudanca de formato aqui precisa ser
// coordenada com os dois repositorios.

export const BILLING_COMMANDS_QUEUE = 'billing-commands'
export const EXECUCAO_COMMANDS_QUEUE = 'execucao-commands'
export const OS_EVENTS_QUEUE = 'os-events'

// ---- Comandos publicados pelo OS Service para o Billing Service ----

export interface QuoteItemInput {
  description: string
  quantity: number
  unitPrice: number
}

export interface GerarOrcamentoCommand {
  type: 'GerarOrcamento'
  serviceOrderId: string
  items: QuoteItemInput[]
}

export interface AprovarOrcamentoCommand {
  type: 'AprovarOrcamento'
  quoteId: string
}

export interface RejeitarOrcamentoCommand {
  type: 'RejeitarOrcamento'
  quoteId: string
}

export type BillingCommand =
  | GerarOrcamentoCommand
  | AprovarOrcamentoCommand
  | RejeitarOrcamentoCommand

// ---- Comandos publicados pelo OS Service para o Execução Service ----

export interface IniciarExecucaoCommand {
  type: 'IniciarExecucao'
  serviceOrderId: string
}

export type ExecucaoCommand = IniciarExecucaoCommand

// ---- Eventos consumidos pelo OS Service em os-events ----

export interface OrcamentoGeradoEvent {
  type: 'OrcamentoGerado'
  serviceOrderId: string
  quoteId: string
  totalAmount: number
}

export interface OrcamentoRejeitadoEvent {
  type: 'OrcamentoRejeitado'
  serviceOrderId: string
  quoteId: string
}

export interface PagamentoPendenteEvent {
  type: 'PagamentoPendente'
  serviceOrderId: string
  quoteId: string
  paymentId: string
  checkoutUrl: string
}

export interface PagamentoConfirmadoEvent {
  type: 'PagamentoConfirmado'
  serviceOrderId: string
  quoteId: string
  paymentId: string
}

export interface PagamentoFalhouEvent {
  type: 'PagamentoFalhou'
  serviceOrderId: string
  quoteId: string
  paymentId: string
  reason: string
}

export interface ExecucaoFinalizadaEvent {
  type: 'ExecucaoFinalizada'
  serviceOrderId: string
  executionId: string
}

export interface ExecucaoFalhouEvent {
  type: 'ExecucaoFalhou'
  serviceOrderId: string
  executionId: string
  reason: string
}

export type OsEvent =
  | OrcamentoGeradoEvent
  | OrcamentoRejeitadoEvent
  | PagamentoPendenteEvent
  | PagamentoConfirmadoEvent
  | PagamentoFalhouEvent
  | ExecucaoFinalizadaEvent
  | ExecucaoFalhouEvent
