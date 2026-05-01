import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LoginUseCase } from '../../../../src/application/use-cases/auth/LoginUseCase.js'
import type { IAdminRepository, AdminRecord } from '../../../../src/domain/admin/repositories/IAdminRepository.js'
import { UnauthorizedError } from '../../../../src/shared/errors/AppError.js'

const mockAdminRecord: AdminRecord = {
  name: 'Admin User',
  id: '1',
  email: 'admin@example.com',
  passwordHash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36IefYLG',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('Auth Use Cases', () => {
  let mockRepository: IAdminRepository

  beforeEach(() => {
    mockRepository = {
      findByEmail: vi.fn(),
    }
  })

  describe('LoginUseCase', () => {
    it('should login successfully with valid credentials', async () => {
      const useCase = new LoginUseCase(mockRepository)
      vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(mockAdminRecord)

      vi.doMock('bcryptjs', () => ({
        default: {
          compare: vi.fn().mockResolvedValueOnce(true),
        },
      }))
    })

    it('should throw UnauthorizedError when admin not found', async () => {
      const useCase = new LoginUseCase(mockRepository)
      vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(null)

      await expect(useCase.execute('admin@example.com', 'password')).rejects.toThrow(
        UnauthorizedError,
      )

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('admin@example.com')
    })

    it('should throw UnauthorizedError with invalid password', async () => {
      const useCase = new LoginUseCase(mockRepository)
      vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(mockAdminRecord)
    })

    it('should call findByEmail with correct email', async () => {
      const useCase = new LoginUseCase(mockRepository)
      vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(null)

      try {
        await useCase.execute('test@example.com', 'password')
      } catch {
        // Expected to throw
      }

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
    })
  })
})
