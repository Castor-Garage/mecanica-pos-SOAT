import { ValidationError } from '../../../shared/errors/AppError.js'

// Supports both old Brazilian format (ABC-1234) and Mercosul (ABC1D23)
const OLD_FORMAT = /^[A-Z]{3}\d{4}$/
const MERCOSUL_FORMAT = /^[A-Z]{3}\d[A-Z]\d{2}$/

export class LicensePlate {
  private readonly _value: string

  private constructor(normalized: string) {
    this._value = normalized
  }

  static create(raw: string): LicensePlate {
    const normalized = raw.replace(/[-\s]/g, '').toUpperCase()

    if (!LicensePlate.isValid(normalized)) {
      throw new ValidationError(`Placa inválida: ${raw}`)
    }

    return new LicensePlate(normalized)
  }

  static isValid(raw: string): boolean {
    const normalized = raw.replace(/[-\s]/g, '').toUpperCase()
    return OLD_FORMAT.test(normalized) || MERCOSUL_FORMAT.test(normalized)
  }

  get value(): string {
    return this._value
  }

  isMercosul(): boolean {
    return MERCOSUL_FORMAT.test(this._value)
  }

  format(): string {
    // ABC1234 → ABC-1234 | ABC1D23 → ABC1D23 (Mercosul has no hyphen standard)
    if (OLD_FORMAT.test(this._value)) {
      return `${this._value.slice(0, 3)}-${this._value.slice(3)}`
    }
    return this._value
  }

  equals(other: LicensePlate): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
