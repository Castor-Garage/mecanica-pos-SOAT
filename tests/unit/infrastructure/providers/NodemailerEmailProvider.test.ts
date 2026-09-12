import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
    createTestAccount: vi.fn(),
    getTestMessageUrl: vi.fn(() => false),
  },
}))

import { NodemailerEmailProvider } from '../../../../src/infrastructure/providers/email/NodemailerEmailProvider.js'
import { IntegrationError } from '../../../../src/shared/errors/AppError.js'

const message = { to: 'cliente@email.com', subject: 'Sua OS', text: 'Resumo da OS' }

describe('NodemailerEmailProvider', () => {
  beforeEach(() => {
    process.env.SMTP_USER = 'smtp-user'
    sendMail.mockReset()
  })

  afterEach(() => {
    delete process.env.SMTP_USER
  })

  it('sends through the configured SMTP server', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg-1' })
    await new NodemailerEmailProvider().send(message)
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'cliente@email.com' }))
  })

  it('turns an SMTP failure into an IntegrationError that keeps the cause', async () => {
    sendMail.mockRejectedValue(new Error('connection refused'))
    const error = await new NodemailerEmailProvider().send(message).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(IntegrationError)
    expect(error).toMatchObject({ statusCode: 502, integration: 'smtp' })
    expect((error as IntegrationError).cause).toEqual(new Error('connection refused'))
  })
})
