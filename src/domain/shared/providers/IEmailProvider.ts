export interface EmailMessage {
  to: string
  subject: string
  text: string
}

export interface IEmailProvider {
  send(message: EmailMessage): Promise<void>
}
