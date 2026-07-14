import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { config } from 'dotenv'

config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// ─── dados ──────────────────────────────────────────────────────────────────

const CLIENTS = [
  {
    id: randomUUID(),
    name: 'João Carlos Pereira',
    document: '52998224725',
    documentType: 'CPF' as const,
    phone: '(11) 98765-4321',
    email: 'joao.pereira@email.com',
    address: 'Rua das Flores, 123 - São Paulo, SP',
  },
  {
    id: randomUUID(),
    name: 'Maria Aparecida Santos',
    document: '71428793860',
    documentType: 'CPF' as const,
    phone: '(21) 99123-4567',
    email: 'maria.santos@gmail.com',
    address: 'Av. Brasil, 456 - Rio de Janeiro, RJ',
  },
  {
    id: randomUUID(),
    name: 'Carlos Eduardo Lima',
    document: '87748248800',
    documentType: 'CPF' as const,
    phone: '(31) 97654-3210',
    email: null,
    address: 'Rua Minas Gerais, 789 - Belo Horizonte, MG',
  },
  {
    id: randomUUID(),
    name: 'Auto Peças Rápido Ltda',
    document: '11222333000181',
    documentType: 'CNPJ' as const,
    phone: '(11) 3333-4444',
    email: 'contato@autopecasrapido.com.br',
    address: 'Av. Paulista, 1000 - São Paulo, SP',
  },
  {
    id: randomUUID(),
    name: 'Transportes Silva ME',
    document: '52026378000190',
    documentType: 'CNPJ' as const,
    phone: '(19) 3211-5678',
    email: 'financeiro@transportesilva.com.br',
    address: 'Rod. Anhanguera, Km 50 - Campinas, SP',
  },
]

const VEHICLES = [
  {
    id: randomUUID(),
    licensePlate: 'ABC1234',
    brand: 'Volkswagen',
    model: 'Gol',
    year: 2018,
    color: 'Branco',
    clientIndex: 0,
  },
  {
    id: randomUUID(),
    licensePlate: 'DEF5678',
    brand: 'Chevrolet',
    model: 'Onix',
    year: 2021,
    color: 'Prata',
    clientIndex: 0,
  },
  {
    id: randomUUID(),
    licensePlate: 'GHI1J23',
    brand: 'Fiat',
    model: 'Argo',
    year: 2022,
    color: 'Vermelho',
    clientIndex: 1,
  },
  {
    id: randomUUID(),
    licensePlate: 'JKL4M56',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: 'Preto',
    clientIndex: 2,
  },
  {
    id: randomUUID(),
    licensePlate: 'MNO7P89',
    brand: 'Ford',
    model: 'Ka',
    year: 2019,
    color: 'Azul',
    clientIndex: 3,
  },
  {
    id: randomUUID(),
    licensePlate: 'PQR2S34',
    brand: 'Hyundai',
    model: 'HB20',
    year: 2023,
    color: 'Cinza',
    clientIndex: 3,
  },
  {
    id: randomUUID(),
    licensePlate: 'STU5678',
    brand: 'Volkswagen',
    model: 'Delivery',
    year: 2020,
    color: 'Branco',
    clientIndex: 4,
  },
  {
    id: randomUUID(),
    licensePlate: 'WXY8Z90',
    brand: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2021,
    color: 'Branco',
    clientIndex: 4,
  },
]

const SERVICES = [
  {
    id: randomUUID(),
    name: 'Troca de Óleo e Filtro',
    description: 'Substituição do óleo do motor e filtro de óleo',
    basePrice: 120.0,
    estimatedMinutes: 30,
  },
  {
    id: randomUUID(),
    name: 'Revisão de Freios',
    description: 'Inspeção e substituição de pastilhas e discos de freio',
    basePrice: 250.0,
    estimatedMinutes: 90,
  },
  {
    id: randomUUID(),
    name: 'Alinhamento e Balanceamento',
    description: 'Alinhamento de direção e balanceamento de rodas',
    basePrice: 180.0,
    estimatedMinutes: 60,
  },
  {
    id: randomUUID(),
    name: 'Diagnóstico Eletrônico',
    description: 'Leitura de falhas com scanner automotivo',
    basePrice: 100.0,
    estimatedMinutes: 45,
  },
  {
    id: randomUUID(),
    name: 'Troca de Correia Dentada',
    description: 'Substituição da correia dentada e tensor',
    basePrice: 650.0,
    estimatedMinutes: 180,
  },
  {
    id: randomUUID(),
    name: 'Revisão Completa',
    description: 'Revisão geral do veículo conforme manual do fabricante',
    basePrice: 450.0,
    estimatedMinutes: 240,
  },
]

const PARTS = [
  {
    id: randomUUID(),
    name: 'Filtro de Óleo Universal',
    description: 'Filtro de óleo compatível com a maioria dos motores',
    unitPrice: 35.0,
    stockQuantity: 50,
    minStock: 10,
    unit: 'un',
  },
  {
    id: randomUUID(),
    name: 'Óleo Motor 5W30 Sintético 1L',
    description: 'Óleo lubrificante sintético 5W30 - 1 litro',
    unitPrice: 42.0,
    stockQuantity: 120,
    minStock: 20,
    unit: 'L',
  },
  {
    id: randomUUID(),
    name: 'Pastilha de Freio Dianteira (Par)',
    description: 'Par de pastilhas de freio dianteiras',
    unitPrice: 89.9,
    stockQuantity: 30,
    minStock: 5,
    unit: 'par',
  },
  {
    id: randomUUID(),
    name: 'Disco de Freio Dianteiro',
    description: 'Disco de freio ventilado dianteiro',
    unitPrice: 145.0,
    stockQuantity: 20,
    minStock: 4,
    unit: 'un',
  },
  {
    id: randomUUID(),
    name: 'Correia Dentada',
    description: 'Correia dentada de distribuição',
    unitPrice: 95.0,
    stockQuantity: 15,
    minStock: 3,
    unit: 'un',
  },
  {
    id: randomUUID(),
    name: 'Vela de Ignição',
    description: 'Vela de ignição iridium',
    unitPrice: 28.5,
    stockQuantity: 80,
    minStock: 16,
    unit: 'un',
  },
]

// ─── seed ───────────────────────────────────────────────────────────────────

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@oficina.com'
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123'
  const existing = await prisma.admin.findUnique({ where: { email } })
  if (existing) {
    console.log(`  ✓ Admin já existe: ${email}`)
    return
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.admin.create({ data: { name: 'Administrador', email, passwordHash } })
  console.log(`  + Admin criado: ${email}`)
}

async function seedClients() {
  for (const c of CLIENTS) {
    const existing = await prisma.client.findUnique({ where: { document: c.document } })
    if (existing) {
      c.id = existing.id
      console.log(`  ✓ Cliente já existe: ${c.name}`)
      continue
    }
    await prisma.client.create({
      data: {
        id: c.id,
        name: c.name,
        document: c.document,
        documentType: c.documentType,
        phone: c.phone,
        email: c.email,
        address: c.address,
      },
    })
    console.log(`  + Cliente criado: ${c.name}`)
  }
}

async function seedVehicles() {
  for (const v of VEHICLES) {
    const existing = await prisma.vehicle.findUnique({ where: { licensePlate: v.licensePlate } })
    if (existing) {
      v.id = existing.id
      console.log(`  ✓ Veículo já existe: ${v.licensePlate}`)
      continue
    }
    await prisma.vehicle.create({
      data: {
        id: v.id,
        licensePlate: v.licensePlate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        color: v.color,
        clientId: CLIENTS[v.clientIndex].id,
      },
    })
    console.log(`  + Veículo criado: ${v.brand} ${v.model} (${v.licensePlate})`)
  }
}

async function seedServices() {
  for (const s of SERVICES) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } })
    if (existing) {
      s.id = existing.id
      console.log(`  ✓ Serviço já existe: ${s.name}`)
      continue
    }
    await prisma.service.create({
      data: {
        id: s.id,
        name: s.name,
        description: s.description,
        basePrice: s.basePrice,
        estimatedMinutes: s.estimatedMinutes,
        isActive: true,
      },
    })
    console.log(`  + Serviço criado: ${s.name}`)
  }
}

async function seedParts() {
  for (const p of PARTS) {
    const existing = await prisma.part.findFirst({ where: { name: p.name } })
    if (existing) {
      p.id = existing.id
      console.log(`  ✓ Peça já existe: ${p.name}`)
      continue
    }
    await prisma.part.create({
      data: {
        id: p.id,
        name: p.name,
        description: p.description,
        unitPrice: p.unitPrice,
        stockQuantity: p.stockQuantity,
        minStock: p.minStock,
        unit: p.unit,
        isActive: true,
      },
    })
    console.log(`  + Peça criada: ${p.name}`)
  }
}

async function seedServiceOrders() {
  const orders = [
    // 1. RECEBIDA – Gol do João, chegou hoje
    {
      orderNumber: 'OS-2026-00001',
      status: 'RECEBIDA' as const,
      clientIndex: 0,
      vehicleIndex: 0,
      problemDescription: 'Carro está fazendo barulho estranho ao frear e o freio parece mole.',
      diagnosis: null,
      quoteTotalAmount: null,
      createdAt: daysAgo(0),
      history: [{ from: null, to: 'RECEBIDA', notes: 'OS aberta na recepção.' }],
      items: [],
      parts: [],
    },
    // 2. EM_DIAGNOSTICO – Argo da Maria
    {
      orderNumber: 'OS-2026-00002',
      status: 'EM_DIAGNOSTICO' as const,
      clientIndex: 1,
      vehicleIndex: 2,
      problemDescription: 'Luz de check-engine acesa e consumo de combustível alto.',
      diagnosis: null,
      quoteTotalAmount: null,
      createdAt: daysAgo(2),
      history: [
        { from: null, to: 'RECEBIDA', notes: 'OS aberta na recepção.' },
        { from: 'RECEBIDA', to: 'EM_DIAGNOSTICO', notes: 'Técnico Marcos iniciou o diagnóstico eletrônico.' },
      ],
      items: [{ serviceIndex: 3, quantity: 1 }],
      parts: [],
    },
    // 3. AGUARDANDO_APROVACAO – Corolla do Carlos
    {
      orderNumber: 'OS-2026-00003',
      status: 'AGUARDANDO_APROVACAO' as const,
      clientIndex: 2,
      vehicleIndex: 3,
      problemDescription: 'Troca de correia dentada preventiva e revisão geral.',
      diagnosis: 'Correia dentada com desgaste acentuado. Recomendada substituição imediata junto com tensor e revisão completa.',
      quoteTotalAmount: 1295.0,
      createdAt: daysAgo(5),
      history: [
        { from: null, to: 'RECEBIDA', notes: 'OS aberta na recepção.' },
        { from: 'RECEBIDA', to: 'EM_DIAGNOSTICO', notes: 'Diagnóstico iniciado.' },
        { from: 'EM_DIAGNOSTICO', to: 'AGUARDANDO_APROVACAO', notes: 'Orçamento enviado ao cliente via WhatsApp.' },
      ],
      items: [
        { serviceIndex: 4, quantity: 1 },
        { serviceIndex: 5, quantity: 1 },
      ],
      parts: [
        { partIndex: 4, quantity: 1 },
      ],
    },
    // 4. EM_EXECUCAO – Onix do João
    {
      orderNumber: 'OS-2026-00004',
      status: 'EM_EXECUCAO' as const,
      clientIndex: 0,
      vehicleIndex: 1,
      problemDescription: 'Revisão completa dos 30.000 km.',
      diagnosis: 'Necessário troca de óleo, filtros e pastilhas dianteiras.',
      quoteTotalAmount: 621.8,
      createdAt: daysAgo(7),
      history: [
        { from: null, to: 'RECEBIDA', notes: 'OS aberta na recepção.' },
        { from: 'RECEBIDA', to: 'EM_DIAGNOSTICO', notes: 'Diagnóstico iniciado.' },
        { from: 'EM_DIAGNOSTICO', to: 'AGUARDANDO_APROVACAO', notes: 'Orçamento aprovado pelo cliente.' },
        { from: 'AGUARDANDO_APROVACAO', to: 'EM_EXECUCAO', notes: 'Aprovação do cliente confirmada. Execução iniciada.' },
      ],
      items: [
        { serviceIndex: 0, quantity: 1 },
        { serviceIndex: 1, quantity: 1 },
      ],
      parts: [
        { partIndex: 0, quantity: 1 },
        { partIndex: 1, quantity: 4 },
        { partIndex: 2, quantity: 1 },
      ],
    },
    // 5. FINALIZADA – Ka da Auto Peças Rápido
    {
      orderNumber: 'OS-2026-00005',
      status: 'FINALIZADA' as const,
      clientIndex: 3,
      vehicleIndex: 4,
      problemDescription: 'Alinhamento, balanceamento e troca de óleo.',
      diagnosis: 'Pneus com pressão incorreta e desgaste irregular. Óleo motor degradado.',
      quoteTotalAmount: 468.0,
      createdAt: daysAgo(14),
      history: [
        { from: null, to: 'RECEBIDA', notes: 'OS aberta na recepção.' },
        { from: 'RECEBIDA', to: 'EM_DIAGNOSTICO', notes: 'Diagnóstico iniciado.' },
        { from: 'EM_DIAGNOSTICO', to: 'AGUARDANDO_APROVACAO', notes: 'Orçamento enviado.' },
        { from: 'AGUARDANDO_APROVACAO', to: 'EM_EXECUCAO', notes: 'Cliente aprovou. Execução iniciada.' },
        { from: 'EM_EXECUCAO', to: 'FINALIZADA', notes: 'Serviços concluídos. Veículo pronto para retirada.' },
      ],
      items: [
        { serviceIndex: 2, quantity: 1 },
        { serviceIndex: 0, quantity: 1 },
      ],
      parts: [
        { partIndex: 0, quantity: 1 },
        { partIndex: 1, quantity: 4 },
      ],
      technicianNotes: 'Pressão dos pneus ajustada para 32 PSI. Óleo trocado com 4L de 5W30 sintético.',
    },
    // 6. ENTREGUE – Sprinter da Transportes Silva
    {
      orderNumber: 'OS-2026-00006',
      status: 'ENTREGUE' as const,
      clientIndex: 4,
      vehicleIndex: 7,
      problemDescription: 'Freios com barulho e pedal esponjoso. Revisão completa solicitada.',
      diagnosis: 'Pastilhas e discos dianteiros desgastados. Fluído de freio contaminado.',
      quoteTotalAmount: 1059.8,
      createdAt: daysAgo(21),
      history: [
        { from: null, to: 'RECEBIDA', notes: 'OS aberta na recepção.' },
        { from: 'RECEBIDA', to: 'EM_DIAGNOSTICO', notes: 'Diagnóstico iniciado.' },
        { from: 'EM_DIAGNOSTICO', to: 'AGUARDANDO_APROVACAO', notes: 'Orçamento enviado ao gestor de frota.' },
        { from: 'AGUARDANDO_APROVACAO', to: 'EM_EXECUCAO', notes: 'Aprovado. Execução iniciada.' },
        { from: 'EM_EXECUCAO', to: 'FINALIZADA', notes: 'Todos os serviços concluídos.' },
        { from: 'FINALIZADA', to: 'ENTREGUE', notes: 'Veículo entregue ao motorista. NF emitida.' },
      ],
      items: [
        { serviceIndex: 1, quantity: 1 },
        { serviceIndex: 5, quantity: 1 },
      ],
      parts: [
        { partIndex: 2, quantity: 1 },
        { partIndex: 3, quantity: 2 },
      ],
      technicianNotes: 'Discos dianteiros trocados (ambos os lados). Fluído de freio DOT4 reposto. Teste de frenagem OK.',
    },
  ]

  for (const o of orders) {
    const existing = await prisma.serviceOrder.findUnique({ where: { orderNumber: o.orderNumber } })
    if (existing) {
      console.log(`  ✓ OS já existe: ${o.orderNumber}`)
      continue
    }

    const client = CLIENTS[o.clientIndex]
    const vehicle = VEHICLES[o.vehicleIndex]

    // timestamps baseados no status
    const startedAt = ['EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE'].includes(o.status)
      ? daysAgo(Math.max(1, 21 - o.history.length * 2))
      : null
    const completedAt = ['FINALIZADA', 'ENTREGUE'].includes(o.status)
      ? daysAgo(Math.max(0, 14 - o.history.length))
      : null
    const deliveredAt = o.status === 'ENTREGUE' ? daysAgo(0) : null

    const so = await prisma.serviceOrder.create({
      data: {
        id: randomUUID(),
        orderNumber: o.orderNumber,
        status: o.status,
        clientId: client.id,
        vehicleId: vehicle.id,
        problemDescription: o.problemDescription,
        diagnosis: o.diagnosis,
        quoteTotalAmount: o.quoteTotalAmount,
        startedAt,
        completedAt,
        deliveredAt,
        technicianNotes: (o as any).technicianNotes ?? null,
        createdAt: o.createdAt,
      },
    })

    // itens de serviço
    for (const item of o.items) {
      const svc = SERVICES[item.serviceIndex]
      await prisma.serviceOrderItem.create({
        data: {
          id: randomUUID(),
          serviceOrderId: so.id,
          serviceId: svc.id,
          quantity: item.quantity,
          unitPrice: svc.basePrice,
        },
      })
    }

    // peças
    for (const part of o.parts) {
      const p = PARTS[part.partIndex]
      await prisma.serviceOrderPart.create({
        data: {
          id: randomUUID(),
          serviceOrderId: so.id,
          partId: p.id,
          quantity: part.quantity,
          unitPrice: p.unitPrice,
        },
      })
    }

    // histórico de status
    let baseTime = new Date(o.createdAt)
    for (const h of o.history) {
      await prisma.oSStatusHistory.create({
        data: {
          id: randomUUID(),
          serviceOrderId: so.id,
          fromStatus: h.from as any,
          toStatus: h.to as any,
          changedAt: new Date(baseTime),
          notes: h.notes,
        },
      })
      baseTime = new Date(baseTime.getTime() + 1000 * 60 * 60 * 24)
    }

    console.log(`  + OS criada: ${o.orderNumber} [${o.status}] — ${client.name} / ${vehicle.brand} ${vehicle.model}`)
  }
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== SEED: Admin ===')
  await seedAdmin()

  console.log('\n=== SEED: Clientes ===')
  await seedClients()

  console.log('\n=== SEED: Veículos ===')
  await seedVehicles()

  console.log('\n=== SEED: Serviços ===')
  await seedServices()

  console.log('\n=== SEED: Peças ===')
  await seedParts()

  console.log('\n=== SEED: Ordens de Serviço ===')
  await seedServiceOrders()

  console.log('\n✅ Seed concluído com sucesso!\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
