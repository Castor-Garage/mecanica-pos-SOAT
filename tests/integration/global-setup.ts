import { execSync } from 'node:child_process'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://workshop:workshop@localhost:5432/mecanica_test_db'

export async function setup() {
  process.env.DATABASE_URL = TEST_DB_URL

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  })

  const adapter = new PrismaPg({ connectionString: TEST_DB_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    const passwordHash = await bcrypt.hash('Admin@123', 4)
    await prisma.admin.upsert({
      where: { email: 'admin@test.com' },
      create: { name: 'Admin Test', email: 'admin@test.com', passwordHash },
      update: {},
    })
  } finally {
    await prisma.$disconnect()
  }
}

export async function teardown() {
  // DB persists between runs; data is cleaned in setup.ts beforeEach
}
