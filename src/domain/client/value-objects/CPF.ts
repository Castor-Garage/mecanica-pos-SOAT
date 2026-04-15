import { ValidationError } from '../../../shared/errors/AppError.js'

export class CPF {
  private readonly _value: string

  private constructor(digits: string) {
    this._value = digits
  }

  static create(raw: string): CPF {
    const digits = raw.replace(/\D/g, '')

    if (!CPF.isValid(digits)) {
      throw new ValidationError(`CPF inválido: ${raw}`)
    }

    return new CPF(digits)
  }

  static isValid(raw: string): boolean {
    const digits = raw.replace(/\D/g, '')

    if (digits.length !== 11) return false
    if (/^(\d)\1{10}$/.test(digits)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i)
    }
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(digits[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i)
    }
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(digits[10])) return false

    return true
  }

  get value(): string {
    return this._value
  }

  format(): string {
    return this._value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  equals(other: CPF): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
