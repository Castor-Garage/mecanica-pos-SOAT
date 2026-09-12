# ADR 0001 — Padrão de comunicação entre os componentes

- **Status**: Aceito

## Contexto

Com o split em 4 repositórios (API Gateway + Lambda de auth, infra K8s,
infra de banco, aplicação principal), é preciso decidir como esses
componentes conversam entre si em runtime: cliente → Gateway → Lambda,
Gateway → aplicação, aplicação → banco.

## Decisão

Comunicação **síncrona via HTTP/REST** em todos os pontos:

- Cliente → API Gateway → Lambda (`POST /auth/cpf`): HTTP síncrono, resposta imediata com o token.
- API Gateway → aplicação principal: proxy HTTP síncrono (integração `HTTP_PROXY` do API Gateway, com ou sem VPC Link).
- Aplicação → RDS: conexão síncrona via `pg`/Prisma (já o padrão desde a Fase 1).
- Aplicação → Lambda: não há chamada direta; o único acoplamento é o segredo JWT compartilhado (RFC 0003) e o parâmetro de banco via SSM — nenhuma chamada de rede entre repo 1 e repo 4 além do que passa pelo Gateway.

Nenhuma mensageria assíncrona (filas, eventos) foi introduzida nesta fase.

## Alternativas consideradas

- **Fila/eventos entre a Lambda e a aplicação** (ex.: SNS/SQS) — rejeitada: não há caso de uso que precise de processamento assíncrono aqui (autenticação é uma operação request/response por natureza) e adicionaria infraestrutura sem necessidade.
- **gRPC entre os serviços** — rejeitada: API Gateway HTTP API e Fastify já falam REST/JSON nativamente; gRPC exigiria camada de tradução no Gateway sem ganho.

## Consequências

- Simplicidade operacional: nenhum broker de mensagens para provisionar/monitorar.
- Acoplamento temporal — se a Lambda estiver indisponível, o cliente não consegue autenticar (não há fila para reter a tentativa); aceitável para o escopo do desafio.
- Toda observabilidade de correlação (`requestId`) permanece válida nesse modelo síncrono, propagada via header `x-request-id` do Gateway até a aplicação (ver `docs/observabilidade.md`).
