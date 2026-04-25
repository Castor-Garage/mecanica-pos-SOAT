import type { IAdminRepository, AdminRecord } from '../../../domain/admin/repositories/IAdminRepository.js'
import { prisma } from '../prisma/client.js'

export class PrismaAdminRepository implements IAdminRepository {
  async findByEmail(email: string): Promise<AdminRecord | null> {
    return prisma.admin.findUnique({ where: { email } })
  }
}
