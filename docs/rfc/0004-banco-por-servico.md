# RFC 0004 — Banco por serviço e NoSQL no Billing Service

- **Status**: Aceito
- **Autores**: Time Castor Garage
- **Relacionado a**: ADR 0006, RFC 0002 (continua válido para o domínio do
  OS Service), `mecanica-db-infra-SOAT`

## Contexto

A Fase 4 exige "nenhum serviço pode acessar diretamente o banco de outro
serviço" e pelo menos um banco não relacional (NoSQL) no conjunto. O RFC
0002 já havia decidido PostgreSQL gerenciado (RDS) para o domínio do OS
Service — essa decisão continua válida, mas precisa de um banco próprio
por serviço novo.

## Decisão

- **OS Service**: continua com o RDS único já existente (RFC 0002) —
  `client`, `vehicle`, `service`, `part`, `service-order`, `admin`. Domínio
  fortemente relacional, sem motivo para mudar.
- **Billing Service** e **Execução Service**: cada um ganha seu próprio
  banco PostgreSQL (`mecanica_billing_db`/`_staging`,
  `mecanica_execucao_db`/`_staging`), instâncias RDS próprias provisionadas
  em `mecanica-db-infra-SOAT/services.tf` (PR #4), com credenciais
  publicadas via SSM Parameter Store
  (`/castor-garage/{service}/database-url[-staging]`, `SecureString`) —
  mesmo padrão já usado para o banco do OS Service (ADR 0003).
- **NoSQL — Amazon DynamoDB** no Billing Service, para `PaymentAttempt`: o
  payload bruto de cada notificação de webhook do Mercado Pago
  (`DynamoPaymentAttemptRepository`, tabela
  `castor-garage-billing-payment-attempts`, `dynamodb.tf` do PR #4; chave
  composta `paymentId` + `receivedAt`). Dado transacional do pagamento
  (status, valor, `checkoutUrl`) continua no Postgres, via
  `IPaymentRepository` — o DynamoDB guarda só o payload de auditoria/replay.

## Por que DynamoDB em vez de MongoDB Atlas

| Critério | DynamoDB | MongoDB Atlas |
|---|---|---|
| Conta | Nativo da conta AWS Academy já usada para EKS/RDS/SQS | Exigiria conta externa separada, fora do escopo de custo/gestão do projeto |
| Credenciais | Acesso via `LabRole`/IMDS do próprio node EKS — mesmo mecanismo já usado para SQS, sem senha/connection string para gerenciar | Precisaria de usuário/senha ou connection string gerenciados à parte |
| Custo | `PAY_PER_REQUEST` — próximo de zero na escala de demonstração do projeto | Tier gratuito tem limites próprios, fora do controle do time |
| Encaixe com o dado | Payload de webhook é semi-estruturado e muda de formato entre eventos do provedor — não precisa de schema fixo nem de joins com o resto do domínio de pagamento | Atenderia igualmente bem, mas sem nenhuma vantagem sobre o DynamoDB aqui |

## Alternativas consideradas

- **Banco único compartilhado entre Billing e Execução** — rejeitada:
  viola diretamente o requisito "nenhum serviço pode acessar diretamente o
  banco de outro".
- **MongoDB Atlas para o NoSQL** — avaliada, descartada pelos motivos da
  tabela acima.
- **Guardar o payload de webhook também no Postgres (coluna JSON)** —
  rejeitada: não atenderia ao requisito explícito de usar pelo menos um
  banco não relacional no projeto.

## Consequências

- 3 bancos PostgreSQL (OS Service, Billing, Execução) + 1 tabela DynamoDB
  a manter/provisionar.
- Nenhuma visão agregada automática entre os 3 bancos — um dashboard
  cross-serviço futuro precisaria agregar via eventos (`os-events`) ou API,
  nunca via `JOIN` direto entre bancos (reforça o orquestrador do ADR 0006).
- `PrismaServiceOrderRepository`/`PrismaQuoteRepository`/
  `PrismaExecutionRepository` continuam isolados por serviço — nenhum deles
  referencia tabelas de outro banco por chave estrangeira.
