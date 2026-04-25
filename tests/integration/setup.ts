import { beforeEach } from 'vitest'
import { prisma } from '../../src/infrastructure/database/prisma/client.js'

beforeEach(async () => {
  await prisma.$executeRaw`
    TRUNCATE TABLE
      os_status_history,
      service_order_items,
      service_order_parts,
      service_orders,
      vehicles,
      clients,
      services,
      parts
    RESTART IDENTITY CASCADE
  `
})
