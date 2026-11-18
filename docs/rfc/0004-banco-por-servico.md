# RFC 0004 — Banco de dados por microsserviço (Fase 4)

- **Status**: Aceito e implementado
- **Autores**: Time Castor Garage
- **Relacionado a**: ADR 0006 (arquitetura de microsserviços), RFC 0002
  (banco de dados gerenciado — parcialmente superado neste ponto),
  `mecanica-db-infra-SOAT`

## Contexto

A Fase 4 exige que cada microsserviço tenha **banco de dados próprio** (sem
acesso direto a banco de outro serviço) e que o conjunto dos serviços use
**pelo menos um banco relacional e um não relacional**. O RFC 0002
(Fase 3) havia avaliado e descartado NoSQL para o domínio da aplicação,
por ser "fortemente relacional" — essa conclusão continua válida para o
que fica no OS Service, mas não se aplica mais ao sistema como um todo,
porque parte do domínio (pagamentos) migrou para um serviço novo.

## Decisão

| Serviço | Banco | Motivo |
|---|---|---|
| **OS Service** | PostgreSQL (RDS existente, `mecanica-db-infra-SOAT`) | Mantém o schema Prisma atual (`Client`, `Vehicle`, `Service`, `Part`, `ServiceOrder`, `ServiceOrderItem`, `ServiceOrderPart`, `OSStatusHistory`) — domínio continua fortemente relacional, sem motivo para migrar (mesma razão do RFC 0002). |
| **Billing Service** | PostgreSQL próprio (instância RDS própria, `services.tf`) para `Quote`/`Payment` (dados transacionais) **+ DynamoDB** para `PaymentAttempt`/payloads crus de webhook do Mercado Pago | Pagamento confirmado é um registro relacional de verdade (valor, status, vínculo com a OS); já as tentativas e payloads de webhook do Mercado Pago variam de formato por tipo de evento e não precisam de schema fixo nem de joins — cumprem aqui o banco NoSQL exigido no conjunto. |
| **Execução/Produção Service** | PostgreSQL próprio (instância RDS própria, `services.tf`) | Fila de execução e histórico de diagnóstico/reparo seguem o mesmo padrão relacional simples do OS Service; não há necessidade de um segundo banco NoSQL além do já coberto no Billing. |

Provisionamento em `mecanica-db-infra-SOAT`: `dynamodb.tf` (tabela
`castor-garage-billing-payment-attempts`, `PAY_PER_REQUEST`, chave composta
`paymentId` + `receivedAt`) e `services.tf` (`local.service_databases`,
`aws_db_instance.service` para cada serviço, credenciais publicadas via SSM
— `/castor-garage/{service}/database-url[-staging]`, mesmo padrão do
RFC 0002/ADR 0003).

### Por que DynamoDB em vez de MongoDB Atlas

Avaliado entre os dois gerenciados possíveis; decisão final por DynamoDB:

| Critério | DynamoDB (escolhido) | MongoDB Atlas |
|---|---|---|
| Conta | Nativo da conta AWS Academy já usada para EKS/RDS/SQS | Exigiria conta externa separada, fora do escopo de custo/gestão do projeto |
| Credenciais | Acesso via `LabRole`/IMDS do próprio node EKS — mesmo mecanismo já usado para SQS, sem senha/connection string para gerenciar | Precisaria de usuário/senha ou connection string gerenciados à parte |
| Custo | `PAY_PER_REQUEST` — próximo de zero na escala de demonstração do projeto | Tier gratuito tem limites próprios, fora do controle do time |
| Encaixe com o dado | Payload de webhook é semi-estruturado e muda de formato entre eventos do provedor — não precisa de schema fixo nem de joins com o resto do domínio de pagamento | Atenderia igualmente bem, mas sem vantagem sobre o DynamoDB aqui |

Implementado em `mecanica-billing-SOAT/src/infrastructure/database/dynamodb/DynamoPaymentAttemptRepository.ts`,
acionado pelo webhook do Mercado Pago antes de decidir confirmar/falhar o
pagamento — ver `IPaymentAttemptRepository` (porta) e
`PAYMENT_ATTEMPTS_TABLE_NAME`/`DYNAMODB_ENDPOINT` (variáveis de ambiente).

### O que acontece com `OSStatusHistory` e os dashboards

`OSStatusHistory` **permanece no OS Service** — ele audita apenas as
transições do agregado `ServiceOrder`, que continua sendo dono do OS
Service. Os dashboards que hoje fazem join direto entre `ServiceOrder` e
`OSStatusHistory` continuam funcionando sem mudança.

O que muda: métricas que dependeriam de dados de pagamento ou execução
**não podem mais ser join SQL direto**, porque esses dados passam a viver
em bancos de outros serviços. Essas métricas passariam a ser alimentadas
pelos eventos que já trafegam em `os-events` (ADR 0006) — por exemplo,
tempo entre `OrcamentoGerado` e `PagamentoConfirmado` calculado a partir do
timestamp dos eventos recebidos, não de uma consulta cruzando bancos
(ainda não implementado nenhum dashboard desse tipo).

## Alternativas consideradas

- **Um único banco compartilhado entre os 3 serviços (schema por
  serviço, mesma instância)** — rejeitada: embora reduza custo/infra,
  viola o espírito do requisito ("nenhum serviço pode acessar
  diretamente o banco de outro") e tende a reintroduzir acoplamento via
  queries cruzadas assim que alguém "só precisar de um join rápido".
- **NoSQL no OS Service** (ex.: mover `OSStatusHistory` para DynamoDB) —
  rejeitada pelo mesmo motivo do RFC 0002: os dashboards de observabilidade
  da Fase 3 já dependem de índices e joins relacionais ali.
- **NoSQL no Execução/Produção Service** (fila como documento) —
  considerada, mas descartada por simplicidade: o conjunto já atende ao
  requisito de 1 NoSQL via o Billing Service.
- **Guardar o payload de webhook também no Postgres (coluna JSON)** —
  rejeitada: não atenderia ao requisito explícito de usar pelo menos um
  banco não relacional no projeto.

## Consequências

- 3 bancos PostgreSQL (OS Service, Billing, Execução) + 1 tabela DynamoDB
  a manter.
- Nenhuma visão agregada automática entre os 3 bancos — um dashboard
  cross-serviço futuro precisaria agregar via eventos (`os-events`) ou API,
  nunca via `JOIN` direto entre bancos (reforça o orquestrador do ADR 0006).
- `PrismaServiceOrderRepository`/`PrismaQuoteRepository`/
  `PrismaExecutionRepository` continuam isolados por serviço — nenhum deles
  referencia tabelas de outro banco por chave estrangeira.
- Migrations/seed de cada novo banco seguem o mesmo fluxo Prisma já usado
  hoje (`prisma migrate deploy` + `npm run db:seed`), replicado por serviço.
