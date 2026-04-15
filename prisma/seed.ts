import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@oficina.com'
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123'

  const existing = await prisma.admin.findUnique({ where: { email } })

  if (existing) {
    console.log(`Admin already exists: ${email}`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.admin.create({
    data: {
      name: 'Administrador',
      email,
      passwordHash,
    },
  })

  console.log(`Admin created: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
