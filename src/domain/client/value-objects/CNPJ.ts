import { ValidationError } from '../../../shared/errors/AppError.js'

export class CNPJ {
  private readonly _value: string

  private constructor(digits: string) {
    this._value = digits
  }

  static create(raw: string): CNPJ {
    const digits = raw.replace(/\D/g, '')

    if (!CNPJ.isValid(digits)) {
      throw new ValidationError(`CNPJ inválido: ${raw}`)
    }

    return new CNPJ(digits)
  }

  static isValid(raw: string): boolean {
    const digits = raw.replace(/\D/g, '')

    if (digits.length !== 14) return false
    if (/^(\d)\1{13}$/.test(digits)) return false

    const calcDigit = (d: string, weights: number[]): number => {
      let sum = 0
      for (let i = 0; i < weights.length; i++) {
        sum += parseInt(d[i]) * weights[i]
      }
      const remainder = sum % 11
      return remainder < 2 ? 0 : 11 - remainder
    }

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    if (calcDigit(digits, w1) !== parseInt(digits[12])) return false
    if (calcDigit(digits, w2) !== parseInt(digits[13])) return false

    return true
  }

  get value(): string {
    return this._value
  }

  format(): string {
    return this._value.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    )
  }

  equals(other: CNPJ): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
