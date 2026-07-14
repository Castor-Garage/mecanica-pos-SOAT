import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SendOrderByEmailUseCase } from '../../../../src/application/use-cases/service-order/SendOrderByEmailUseCase.js'
import type {
  IServiceOrderRepository,
  ServiceOrderFullRecord,
} from '../../../../src/domain/service-order/repositories/IServiceOrderRepository.js'
import type { IEmailProvider } from '../../../../src/domain/shared/providers/IEmailProvider.js'
import { OSStatus } from '../../../../src/domain/service-order/value-objects/OSStatus.js'
import { NotFoundError } from '../../../../src/shared/errors/AppError.js'

function makeOrder(overrides: Partial<ServiceOrderFullRecord> = {}): ServiceOrderFullRecord {
  return {
    id: 'order-1',
    orderNumber: 'OS-2025-00001',
    status: OSStatus.AGUARDANDO_APROVACAO,
    clientId: 'client-1',
    vehicleId: 'vehicle-1',
    problemDescription: null,
    diagnosis: null,
    quoteTotalAmount: null,
    quoteApprovedAt: null,
    quoteRejectedAt: null,
    startedAt: null,
    completedAt: null,
    deliveredAt: null,
    technicianNotes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    client: { id: 'c1', name: 'Carlos Henrique', document: '123', phone: '99' },
    vehicle: { id: 'v1', licensePlate: 'ABC1234', brand: 'Toyota', model: 'Corolla', year: 2020 },
    items: [],
    parts: [],
    ...overrides,
  }
}

describe('SendOrderByEmailUseCase', () => {
  let repo: IServiceOrderRepository
  let emailProvider: IEmailProvider
  let useCase: SendOrderByEmailUseCase

  beforeEach(() => {
    repo = {
      findById: vi.fn(),
      findByOrderNumber: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      setTimestamp: vi.fn(),
      approveQuote: vi.fn(),
      rejectQuote: vi.fn(),
      getServiceStats: vi.fn(),
    }
    emailProvider = { send: vi.fn() }
    useCase = new SendOrderByEmailUseCase(repo, emailProvider)
  })

  it('envia e-mail usando apenas o primeiro nome do cliente', async () => {
    const order = makeOrder({ client: { id: 'c1', name: 'Carlos Henrique', document: '123', phone: '99' } })
    vi.mocked(repo.findById).mockResolvedValueOnce(order)

    await useCase.execute('order-1', 'destino@exemplo.com')

    expect(emailProvider.send).toHaveBeenCalledTimes(1)
    const message = vi.mocked(emailProvider.send).mock.calls[0][0]
    expect(message.to).toBe('destino@exemplo.com')
    expect(message.subject).toContain('OS-2025-00001')
    expect(message.text).toContain('Olá, Carlos!')
    expect(message.text).not.toContain('Henrique')
  })

  it('funciona quando o nome do cliente tem um único token', async () => {
    const order = makeOrder({ client: { id: 'c1', name: 'Maria', document: '123', phone: '99' } })
    vi.mocked(repo.findById).mockResolvedValueOnce(order)

    await useCase.execute('order-1', 'destino@exemplo.com')

    const message = vi.mocked(emailProvider.send).mock.calls[0][0]
    expect(message.text).toContain('Olá, Maria!')
  })

  it('inclui status, veículo e omite problema/diagnóstico/orçamento quando nulos', async () => {
    const order = makeOrder({ status: OSStatus.RECEBIDA })
    vi.mocked(repo.findById).mockResolvedValueOnce(order)

    await useCase.execute('order-1', 'destino@exemplo.com')

    const message = vi.mocked(emailProvider.send).mock.calls[0][0]
    expect(message.text).toContain('Status: Recebida')
    expect(message.text).toContain('Toyota Corolla (ABC1234)')
    expect(message.text).not.toContain('Problema:')
    expect(message.text).not.toContain('Diagnóstico:')
    expect(message.text).not.toContain('Orçamento:')
  })

  it('inclui problema, diagnóstico e orçamento quando presentes', async () => {
    const order = makeOrder({
      problemDescription: 'Barulho no motor',
      diagnosis: 'Correia gasta',
      quoteTotalAmount: 150.5,
    })
    vi.mocked(repo.findById).mockResolvedValueOnce(order)

    await useCase.execute('order-1', 'destino@exemplo.com')

    const message = vi.mocked(emailProvider.send).mock.calls[0][0]
    expect(message.text).toContain('Problema: Barulho no motor')
    expect(message.text).toContain('Diagnóstico: Correia gasta')
    expect(message.text).toContain('Orçamento: R$ 150,50')
  })

  it('lista serviços e peças quando existem', async () => {
    const order = makeOrder({
      items: [{ id: 'i1', serviceId: 's1', serviceName: 'Troca de óleo', quantity: 2, unitPrice: 50 }],
      parts: [{ id: 'p1', partId: 'pt1', partName: 'Filtro de óleo', quantity: 1, unitPrice: 30 }],
    })
    vi.mocked(repo.findById).mockResolvedValueOnce(order)

    await useCase.execute('order-1', 'destino@exemplo.com')

    const message = vi.mocked(emailProvider.send).mock.calls[0][0]
    expect(message.text).toContain('- Troca de óleo x2: R$ 100,00')
    expect(message.text).toContain('- Filtro de óleo x1: R$ 30,00')
  })

  it('usa "nenhum"/"nenhuma" quando não há serviços ou peças', async () => {
    const order = makeOrder({ items: [], parts: [] })
    vi.mocked(repo.findById).mockResolvedValueOnce(order)

    await useCase.execute('order-1', 'destino@exemplo.com')

    const message = vi.mocked(emailProvider.send).mock.calls[0][0]
    expect(message.text).toContain('- nenhum')
    expect(message.text).toContain('- nenhuma')
  })

  it('lança NotFoundError quando a OS não existe e não envia e-mail', async () => {
    vi.mocked(repo.findById).mockResolvedValueOnce(null)

    await expect(useCase.execute('order-inexistente', 'destino@exemplo.com')).rejects.toThrow(NotFoundError)

    expect(emailProvider.send).not.toHaveBeenCalled()
  })
})
