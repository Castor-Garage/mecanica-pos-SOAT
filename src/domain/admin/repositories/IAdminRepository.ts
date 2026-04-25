export interface AdminRecord {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export interface IAdminRepository {
  findByEmail(email: string): Promise<AdminRecord | null>
}
