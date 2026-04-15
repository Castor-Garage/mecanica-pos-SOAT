export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const detail = identifier ? ` (${identifier})` : ''
    super(`${resource} não encontrado${detail}`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION')
    this.name = 'BusinessRuleError'
  }
}

export class InsufficientStockError extends AppError {
  constructor(partName: string, available: number, requested: number) {
    super(
      `Estoque insuficiente para "${partName}": disponível ${available}, solicitado ${requested}`,
      422,
      'INSUFFICIENT_STOCK',
    )
    this.name = 'InsufficientStockError'
  }
}
