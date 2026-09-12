# Observabilidade: logs, correlação e eventos de negócio

A API não depende de nenhuma ferramenta de monitoramento. Tudo sai como log no stdout do container, e o agente instalado no cluster (New Relic ou Datadog) coleta e interpreta.

## Formato dos logs

| `NODE_ENV` | Saída |
|---|---|
| `development` | texto colorido, para leitura humana |
| `test` | desligado |
| qualquer outro (`production`, homologação) | uma linha JSON por log |

Exemplo de linha em produção:

```json
{"level":"info","time":"2026-09-11T19:40:12.345Z","service":"castor-garage-api","env":"production","hostname":"castor-garage-api-6d9f7c-x2k4p","requestId":"JKJaXmPLvHcESHA=","req":{"method":"POST","url":"/service-orders/3f1c.../advance"},"msg":"incoming request"}
```

- `level` sai como texto (`info`, `warn`, `error`) e `time` em ISO 8601.
- `hostname` é o nome do pod no Kubernetes.
- O nível mínimo vem de `LOG_LEVEL` (padrão `info`).
- Cada requisição gera `incoming request` e `request completed`; a segunda traz `responseTime` em milissegundos.

## Correlação entre requisições

- Toda requisição tem um `requestId`, presente em todas as linhas de log dela, inclusive nos eventos de negócio.
- Se quem chama envia o header `x-request-id`, a API reaproveita o valor. Se não envia, ela gera um UUID. Valores estranhos (muito longos, com espaço ou quebra de linha) também são trocados por um UUID.
- A resposta sempre devolve o `x-request-id`, inclusive em erros.
- **Para quem configurar o API Gateway:** repassar o id do Gateway nesse header. No HTTP API da AWS isso é um parameter mapping `overwrite:header.x-request-id` com o valor `$context.requestId`. Assim o mesmo id aparece no log do Gateway, da Lambda e da API.

## Eventos de negócio

São linhas de log com o campo `event`, feitas para dashboards e alertas.

| `event` | Quando | Campos |
|---|---|---|
| `service_order.created` | OS aberta | `orderId`, `orderNumber`, `clientId`, `quoteTotalAmount` |
| `service_order.status_changed` | toda mudança de status, venha do painel, da tela do cliente ou do webhook de e-mail | `orderId`, `orderNumber`, `fromStatus`, `toStatus`, `secondsInPreviousStatus` |
| `service_order.processing_failed` | erro inesperado numa rota de OS (nível `error`) ou regra de negócio que bloqueou a OS, como falta de estoque (nível `warn`) | `route`, `statusCode`, `code`, `error` |
| `integration.failed` | falha ao enviar e-mail (SMTP) ou ao processar o webhook de e-mail | `integration` (`smtp` ou `email_webhook`), `route`, `statusCode`, `code`, `error`, `cause` |

- `secondsInPreviousStatus` é quanto tempo a OS ficou no status que acabou de deixar (`fromStatus`).
- Erros comuns de cliente (401, 403, 404, validação) nas rotas de OS não viram evento. Eles continuam nos logs normais da requisição.
- Falha de SMTP responde `502` ao cliente com uma mensagem genérica; o erro original fica em `cause`, só no log.

## Sugestões de consultas (New Relic, NRQL)

Conferir os nomes dos atributos no New Relic depois que os primeiros logs chegarem.

| Painel ou alerta | Consulta |
|---|---|
| Volume diário de OS | `SELECT count(*) FROM Log WHERE event = 'service_order.created' TIMESERIES 1 day SINCE 30 days ago` |
| Tempo médio por status | `SELECT average(secondsInPreviousStatus) / 60 AS 'minutos' FROM Log WHERE event = 'service_order.status_changed' FACET fromStatus SINCE 30 days ago` |
| Erros nas integrações | `SELECT count(*) FROM Log WHERE event = 'integration.failed' FACET integration TIMESERIES SINCE 1 day ago` |
| Alerta de falha no processamento de OS | condição sobre `SELECT count(*) FROM Log WHERE event = 'service_order.processing_failed' AND level = 'error'`, disparando acima de 0 em 5 minutos |

No tempo médio por status, `EM_DIAGNOSTICO` é o diagnóstico, `EM_EXECUCAO` é a execução e `FINALIZADA` é o tempo entre finalizar e entregar.

Latência das rotas, CPU e memória do cluster e uptime vêm do agente e do APM da ferramenta, não destes eventos. O monitor de uptime deve apontar para `GET /health`.
