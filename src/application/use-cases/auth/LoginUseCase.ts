import bcrypt from 'bcryptjs'
import type { IAdminRepository, AdminRecord } from '../../../domain/admin/repositories/IAdminRepository.js'
import { UnauthorizedError } from '../../../shared/errors/AppError.js'

export class LoginUseCase {
  constructor(private readonly adminRepo: IAdminRepository) {}

  async execute(email: string, password: string): Promise<AdminRecord> {
    const admin = await this.adminRepo.findByEmail(email)

    if (!admin) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) {
      throw new UnauthorizedError('Credenciais inválidas')
    }

    return admin
  }
}
