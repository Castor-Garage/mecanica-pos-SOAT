# Rodando a saga completa localmente (sem depender da conta AWS Academy)

Guia para gravar o vídeo da Fase 4 demonstrando o fluxo assíncrono real
(OS Service → Billing Service → Execução Service) sem precisar que o
cluster EKS/RDS da conta AWS Academy esteja no ar. Usa
[LocalStack](https://www.localstack.cloud/) para simular o Amazon SQS —
mesmo protocolo, mesmo adapter (`SqsMessageBus`) que roda em produção (ver
ADR 0006), só o endpoint muda.

## 1. Subir o LocalStack (SQS) e criar as 3 filas

```bash
docker run -d --name saga-demo-sqs -p 4566:4566 localstack/localstack

# aguardar alguns segundos o LocalStack subir, depois:
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs create-queue --queue-name billing-commands
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs create-queue --queue-name execucao-commands
aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs create-queue --queue-name os-events
```

(Qualquer valor serve para `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` — o
LocalStack não valida credenciais. Ex.: `export AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test` antes dos comandos acima, se o CLI reclamar.)

## 2. Banco de cada serviço

Cada serviço precisa do seu próprio Postgres local (ver README de cada
repositório, seção "Rodar localmente"). Um container por serviço é
suficiente:

```bash
docker run -d --name pg-os       -e POSTGRES_USER=workshop -e POSTGRES_PASSWORD=workshop -e POSTGRES_DB=mecanica_db          -p 5432:5432 postgres:16-alpine
docker run -d --name pg-billing  -e POSTGRES_USER=workshop -e POSTGRES_PASSWORD=workshop -e POSTGRES_DB=mecanica_billing_db  -p 5433:5432 postgres:16-alpine
docker run -d --name pg-execucao -e POSTGRES_USER=workshop -e POSTGRES_PASSWORD=workshop -e POSTGRES_DB=mecanica_execucao_db -p 5434:5432 postgres:16-alpine
```

Em cada repositório: `.env` com o `DATABASE_URL` correspondente, depois
`npm run db:migrate:deploy` (ou `db:migrate` em dev) para aplicar as
migrations.

## 3. Variáveis de ambiente de mensageria (as 3 mesmas em cada serviço)

Adicionar ao `.env` de `mecanica-pos-SOAT`, `mecanica-billing-SOAT` e
`mecanica-execucao-SOAT`:

```bash
MESSAGE_BUS_DRIVER=sqs
SQS_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

Sem essas variáveis, cada serviço usa o adapter em memória
(`InMemoryMessageBus`) — útil para testes, mas **não** se comunica entre
processos, então para a gravação elas são obrigatórias.

## 4. Subir os 3 serviços

Em 3 terminais separados:

```bash
cd mecanica-pos-SOAT      && npm run dev   # porta 3000
cd mecanica-billing-SOAT  && npm run dev   # porta 3001 (ajustar PORT no .env)
cd mecanica-execucao-SOAT && npm run dev   # porta 3002 (ajustar PORT no .env)
```

## 5. Roteiro da demonstração

1. Login admin + criar cliente/veículo/serviço (ou usar o seed) no OS
   Service — `POST /service-orders` já publica `GerarOrcamento`.
2. No log do Billing Service: aparece o consumo do comando e a criação do
   `Quote`, publicando `OrcamentoGerado`.
3. No log do OS Service: o `sagaConsumer` grava o `billingQuoteId` na OS
   (visível em `GET /service-orders/:id`).
4. Avançar a OS até `AGUARDANDO_APROVACAO` (`POST /service-orders/:id/advance`
   duas vezes) e aprovar (`POST /service-orders/:id/approve`) — publica
   `AprovarOrcamento`.
5. No Billing: cria a preferência no Mercado Pago de verdade (requer
   `MERCADOPAGO_ACCESS_TOKEN` de sandbox — ver README do Billing) e publica
   `PagamentoPendente`. **Atalho para gravar sem esperar o pagamento real**:
   publicar manualmente o evento seguinte direto na fila, simulando o
   webhook do Mercado Pago já confirmado:
   ```bash
   aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs send-message \
     --queue-url http://localhost:4566/000000000000/os-events \
     --message-body '{"type":"PagamentoConfirmado","serviceOrderId":"<id-da-OS>","quoteId":"<id-do-quote>","paymentId":"<qualquer-id>"}'
   ```
6. No log do OS Service: o `sagaConsumer` recebe `PagamentoConfirmado` e
   publica `IniciarExecucao` em `execucao-commands`.
7. No log do Execução Service: consome o comando e cria o item na fila de
   execução (`AGUARDANDO`).
8. Simular a finalização (ou implementar o avanço manual do Execução
   Service, se já estiver pronto) publicando em `os-events`:
   ```bash
   aws --endpoint-url=http://localhost:4566 --region us-east-1 sqs send-message \
     --queue-url http://localhost:4566/000000000000/os-events \
     --message-body '{"type":"ExecucaoFinalizada","serviceOrderId":"<id-da-OS>","executionId":"<qualquer-id>"}'
   ```
9. `GET /service-orders/:id` no OS Service: status `FINALIZADA`.
10. **Cenário de compensação** (opcional, reforça o requisito da saga):
    repetir o fluxo até o pagamento e publicar `PagamentoFalhou` em vez de
    `PagamentoConfirmado` — a OS vai para `CANCELADA`.

Os testes automatizados do orquestrador
(`tests/unit/infrastructure/messaging/sagaConsumer.test.ts`, no OS Service)
cobrem exatamente esses mesmos eventos sem precisar de LocalStack nem dos
outros dois serviços no ar — útil para mostrar no vídeo como evidência
complementar à demonstração ao vivo.
