import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs'
import type { IMessageBus } from '../../domain/shared/messaging/IMessageBus.js'

// Adapter real de mensageria (ver ADR 0006) - usa Amazon SQS, ou qualquer
// endpoint compativel (ex. LocalStack via SQS_ENDPOINT, usado para rodar a
// saga localmente sem depender da conta AWS Academy). Resolve a URL de cada
// fila por nome logico (ex. "billing-commands"):
//   1. variavel SQS_<NOME_DA_FILA>_QUEUE_URL (ex. SQS_BILLING_COMMANDS_QUEUE_URL),
//      publicada via SSM/Terraform em producao - mesma convencao ja usada
//      nos .env.example antes deste adapter existir;
//   2. GetQueueUrl pelo proprio nome, como fallback (ambiente local).
export class SqsMessageBus implements IMessageBus {
  private readonly client: SQSClient
  private readonly queueUrlCache = new Map<string, string>()
  private readonly activePollers = new Set<string>()

  constructor() {
    this.client = new SQSClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
      ...(process.env.SQS_ENDPOINT ? { endpoint: process.env.SQS_ENDPOINT } : {}),
    })
  }

  async publish<T>(queue: string, message: T): Promise<void> {
    const queueUrl = await this.resolveQueueUrl(queue)
    await this.client.send(
      new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(message) }),
    )
  }

  subscribe<T>(queue: string, handler: (message: T) => Promise<void>): void {
    if (this.activePollers.has(queue)) return
    this.activePollers.add(queue)
    void this.poll(queue, handler)
  }

  private async poll<T>(queue: string, handler: (message: T) => Promise<void>): Promise<void> {
    const queueUrl = await this.resolveQueueUrl(queue)

    // Long polling continuo - roda ate o processo encerrar (ver bootstrapConsumers.ts/sagaConsumer.ts)
    for (;;) {
      const { Messages } = await this.client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
        }),
      )

      for (const msg of Messages ?? []) {
        try {
          if (msg.Body) {
            await handler(JSON.parse(msg.Body) as T)
          }
          if (msg.ReceiptHandle) {
            await this.client.send(
              new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: msg.ReceiptHandle }),
            )
          }
        } catch {
          // Nao apaga a mensagem: volta a fila apos o visibility timeout e e
          // reprocessada (ou cai na DLQ, se configurada no Terraform).
        }
      }
    }
  }

  private async resolveQueueUrl(queue: string): Promise<string> {
    const cached = this.queueUrlCache.get(queue)
    if (cached) return cached

    const envKey = `SQS_${queue.toUpperCase().replace(/-/g, '_')}_QUEUE_URL`
    const fromEnv = process.env[envKey]
    if (fromEnv) {
      this.queueUrlCache.set(queue, fromEnv)
      return fromEnv
    }

    const { QueueUrl } = await this.client.send(new GetQueueUrlCommand({ QueueName: queue }))
    if (!QueueUrl) {
      throw new Error(`Fila "${queue}" não encontrada (defina ${envKey} ou crie a fila com esse nome)`)
    }
    this.queueUrlCache.set(queue, QueueUrl)
    return QueueUrl
  }
}
