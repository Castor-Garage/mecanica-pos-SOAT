import { describe, expect, it } from 'vitest'
import { isValidCpf, onlyDigits } from '../src/cpf.js'

describe('onlyDigits', () => {
  it('remove pontuação do CPF', () => {
    expect(onlyDigits('123.456.789-09')).toBe('12345678909')
  })
})

describe('isValidCpf', () => {
  it('aceita um CPF válido, com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224725')).toBe(true)
  })

  it('rejeita tamanho diferente de 11 dígitos', () => {
    expect(isValidCpf('123456789')).toBe(false)
    expect(isValidCpf('123456789012')).toBe(false)
  })

  it('rejeita sequências de dígitos repetidos', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCpf('00000000000')).toBe(false)
  })

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCpf('529.982.247-26')).toBe(false)
  })

  it('rejeita entrada vazia ou não numérica', () => {
    expect(isValidCpf('')).toBe(false)
    expect(isValidCpf('abc.def.ghi-jk')).toBe(false)
  })
})
