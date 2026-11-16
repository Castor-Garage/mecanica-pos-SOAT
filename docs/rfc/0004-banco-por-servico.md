# RFC 0004 — Banco de dados por microsserviço (Fase 4)

- **Status**: Aceito
- **Autores**: Time Castor Garage
- **Relacionado a**: ADR 0006 (arquitetura de microsserviços), RFC 0002
  (banco de dados gerenciado — parcialmente superado neste ponto)

## Contexto

A Fase 4 exige que cada microsserviço tenha **banco de dados próprio** (sem
acesso direto a banco de outro serviço) e que o conjunto dos serviços use
**pelo menos um banco relacional e um não relacional**. O RFC 0002
(Fase 3) havia avaliado e descartado NoSQL para o domínio da aplicação,
por ser "fortemente relacional" — essa conclusão continua válida para o
que fica no OS Service, mas não se aplica mais ao sistema como um todo,
porque parte do domínio (pagamentos) migra para um serviço novo.

## Decisão

| Serviço | Banco | Motivo |
|---|---|---|
| **OS Service** | PostgreSQL (RDS existente, `mecanica-db-infra-SOAT`) | Mantém o schema Prisma atual (`Client`, `Vehicle`, `Service`, `Part`, `ServiceOrder`, `ServiceOrderItem`, `ServiceOrderPart`, `OSStatusHistory`) — domínio continua fortemente relacional, sem motivo para migrar (mesma razão do RFC 0002). |
| **Billing Service** | PostgreSQL próprio (nova instância RDS) para `Quote`/`Payment` (dados transacionais, exigem consistência forte) **+ MongoDB/DynamoDB** para `PaymentAttempt`/payloads crus de webhook do Mercado Pago | Pagamento confirmado é um registro relacional de verdade (valor, status, vínculo com a OS); já as tentativas e payloads de webhook do Mercado Pago variam de formato por tipo de evento e não precisam de schema fixo nem de joins — cumprem aqui o banco NoSQL exigido no conjunto. |
| **Execução/Produção Service** | PostgreSQL próprio (nova instância RDS) | Fila de execução e histórico de diagnóstico/reparo seguem o mesmo padrão relacional simples do OS Service; não há necessidade de um segundo banco NoSQL além do já coberto no Billing. |

### O que acontece com `OSStatusHistory` e os dashboards

`OSStatusHistory` **permanece no OS Service** — ele audita apenas as
transições do agregado `ServiceOrder`, que continua sendo dono do OS
Service. Os dashboards que hoje fazem join direto entre `ServiceOrder` e
`OSStatusHistory` continuam funcionando sem mudança.

O que muda: métricas que hoje dependeriam de dados de pagamento ou
execução (se viessem a existir) **não podem mais ser join SQL direto**,
porque esses dados passam a viver em bancos de outros serviços. Essas
métricas passam a ser alimentadas pelos eventos que já trafegam em
`os-events` (ADR 0006) — por exemplo, tempo entre `OrcamentoGerado` e
`PagamentoConfirmado` é calculado a partir do timestamp dos eventos
recebidos, não de uma consulta cruzando bancos.

## Alternativas consideradas

- **Um único banco compartilhado entre os 3 serviços (schema por
  serviço, mesma instância)** — rejeitada: embora reduza custo/infra,
  viola o espírito do requisito ("nenhum serviço pode acessar
  diretamente o banco de outro") e tende a reintroduzir acoplamento via
  queries cruzadas assim que alguém "só precisar de um join rápido".
- **NoSQL no OS Service** (ex.: mover `OSStatusHistory` para DynamoDB) —
  rejeitada pelo mesmo motivo do RFC 0002: os dashboards de observabilidade
  da Fase 3 já dependem de índices e joins relacionais ali; mexer nisso
  não traria benefício e arriscaria quebrar as queries de métricas
  existentes.
- **NoSQL no Execução/Produção Service** (fila como documento) —
  considerada, mas descartada por simplicidade: o conjunto já atende ao
  requisito de 1 NoSQL via o Billing Service, e o domínio de execução é
  simples o bastante para não precisar de schema flexível.

## Consequências

- 2 instâncias RDS novas (Billing e Execução) além da existente do OS
  Service — provisionamento Terraform a ser adicionado em
  `mecanica-db-infra-SOAT` (ou repositório equivalente), seguindo o
  mesmo padrão do RFC 0002 (`db.t3.micro`, `DATABASE_URL` publicada via
  SSM Parameter Store).
- 1 instância MongoDB (ou tabela DynamoDB) nova para o Billing Service —
  a decidir entre MongoDB Atlas free tier (menos integrado à conta AWS
  Academy, mas setup mais rápido) ou DynamoDB (gerenciado nativo na AWS,
  já usada no resto do projeto) na implementação da Fase 2 do backlog
  (ver plano de migração).
- Migrations/seed de cada novo banco seguem o mesmo fluxo Prisma já usado
  hoje (`prisma migrate deploy` + `npm run db:seed`), replicado por
  serviço.
