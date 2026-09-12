// Validação de CPF: formato e dígitos verificadores (mesmo algoritmo usado
// pela Receita Federal). Não faz consulta a nenhum serviço externo — apenas
// garante que a string é estruturalmente um CPF válido antes de bater no banco.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCpf(rawCpf: string): boolean {
  const cpf = onlyDigits(rawCpf)

  if (cpf.length !== 11) return false
  // sequências como "00000000000", "11111111111" passam no cálculo do dígito
  // verificador mas nunca são CPFs reais
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)

  const checkDigit = (length: number): number => {
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += (digits[i] ?? 0) * (length + 1 - i)
    }
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10]
}
