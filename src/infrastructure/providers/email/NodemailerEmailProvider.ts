import nodemailer, { type Transporter } from 'nodemailer'
import type { EmailMessage, IEmailProvider } from '../../../domain/shared/providers/IEmailProvider.js'
import { IntegrationError } from '../../../shared/errors/AppError.js'

export class NodemailerEmailProvider implements IEmailProvider {
  private transporterPromise: Promise<Transporter> | null = null

  private async getTransporter(): Promise<Transporter> {
    if (!this.transporterPromise) {
      this.transporterPromise = process.env.SMTP_USER
        ? Promise.resolve(
            nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT ?? 587),
              secure: process.env.SMTP_SECURE === 'true',
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            }),
          )
        : nodemailer.createTestAccount().then((testAccount) =>
            nodemailer.createTransport({
              host: testAccount.smtp.host,
              port: testAccount.smtp.port,
              secure: testAccount.smtp.secure,
              auth: { user: testAccount.user, pass: testAccount.pass },
            }),
          )
    }
    return this.transporterPromise
  }

  async send(message: EmailMessage): Promise<void> {
    const info = await this.deliver(message).catch((err: unknown) => {
      // drop the cached transporter so the next attempt starts from scratch
      this.transporterPromise = null
      throw new IntegrationError(
        'smtp',
        'Não foi possível enviar o e-mail. Tente novamente mais tarde.',
        err,
      )
    })

    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`[email] sem SMTP_USER configurado — pré-visualização (Ethereal): ${previewUrl}`)
    }
  }

  private async deliver(message: EmailMessage) {
    const transporter = await this.getTransporter()
    return transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@oficina.com',
      ...message,
    })
  }
}
