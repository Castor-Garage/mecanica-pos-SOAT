import { describe, it, expect, vi } from 'vitest'
import { InMemoryMessageBus } from '../../../../src/infrastructure/messaging/InMemoryMessageBus.js'

describe('InMemoryMessageBus', () => {
  it('delivers a published message to a subscriber of the same queue', async () => {
    const bus = new InMemoryMessageBus()
    const handler = vi.fn().mockResolvedValue(undefined)

    bus.subscribe('os-events', handler)
    await bus.publish('os-events', { type: 'OrcamentoGerado' })

    expect(handler).toHaveBeenCalledWith({ type: 'OrcamentoGerado' })
  })

  it('does not deliver messages to subscribers of a different queue', async () => {
    const bus = new InMemoryMessageBus()
    const handler = vi.fn().mockResolvedValue(undefined)

    bus.subscribe('billing-commands', handler)
    await bus.publish('os-events', { type: 'OrcamentoGerado' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('delivers to every subscriber of the same queue, in order', async () => {
    const bus = new InMemoryMessageBus()
    const calls: string[] = []
    bus.subscribe('os-events', async () => {
      calls.push('first')
    })
    bus.subscribe('os-events', async () => {
      calls.push('second')
    })

    await bus.publish('os-events', { type: 'OrcamentoGerado' })

    expect(calls).toEqual(['first', 'second'])
  })

  it('publishing to a queue with no subscribers does not throw', async () => {
    const bus = new InMemoryMessageBus()
    await expect(bus.publish('billing-commands', { type: 'GerarOrcamento' })).resolves.toBeUndefined()
  })
})
