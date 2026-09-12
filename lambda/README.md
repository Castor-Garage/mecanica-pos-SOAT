# Castor Garage - Auth Lambda (CPF)

Function Serverless de autenticação por CPF do Tech Challenge Fase 3 (SOAT). Corresponde ao repositório 1 dos 4 exigidos pela entrega ("Lambda (Function Serverless)").

> **Status atual:** vive como subpasta (`/lambda`) deste mesmo repositório enquanto está em desenvolvimento. Antes da entrega final precisa ser extraída para um repositório próprio (`mecanica-auth-lambda-SOAT`, com histórico via `git subtree split`), conforme exigido pelo enunciado — cada um dos 4 componentes (Lambda, infra Kubernetes, infra do banco, aplicação) em repositório separado com CI/CD e deploy próprios.

## Propósito

Substitui o login por e-mail/senha para clientes finais: o cliente informa apenas o CPF, a função valida o dígito verificador, consulta o cliente no banco gerenciado e — se ele existir e estiver com `status = ATIVO` — devolve um JWT que a API principal (pasta raiz deste repositório) já sabe validar (`role: client`, ver `../src/shared/types/jwt.d.ts` e `../src/infrastructure/http/middlewares/auth.middleware.ts`).

Fluxo completo:

```
Cliente → API Gateway (HTTP API) → Lambda (este repo)
                                       │
                                       ├─ valida formato/dígitos do CPF
                                       ├─ consulta tabela `clients` no RDS
                                       └─ assina JWT (HS256, mesmo JWT_SECRET da API)
                                       ↓
Cliente ← { token, client } ←──────────┘

Cliente → API Gateway → API principal (EKS), com `Authorization: Bearer <token>`
```

## Tecnologias

- Node.js 20 + TypeScript
- `pg` (consulta direta à tabela `clients`, sem Prisma — evita empacotar o query engine nativo do Prisma na Lambda)
- `jsonwebtoken` (HS256, compatível com `@fastify/jwt` da API principal)
- `esbuild` (bundle único para o pacote da Lambda)
- `vitest` (testes)
- Terraform (`infra/`): `aws_lambda_function` + API Gateway HTTP API (`aws_apigatewayv2_*`)
- AWS Academy (Learner Lab): `LabRole` reaproveitado como execution role da Lambda — a conta não permite criar roles IAM novas (mesmo padrão do repo de infraestrutura Kubernetes)

## Endpoint

```
POST /auth/cpf
Content-Type: application/json

{ "cpf": "529.982.247-25" }
```

Respostas:

| Status | Quando |
|---|---|
| `200` | `{ "token": "...", "client": { "id": "...", "name": "..." } }` |
| `400` | CPF ausente, malformado ou com dígito verificador inválido |
| `404` | CPF não cadastrado **ou** cliente com status diferente de `ATIVO` (mesma resposta nos dois casos, para não revelar se o CPF existe) |

## Passos para execução local

```bash
npm install
cp .env.example .env    # preencha DATABASE_URL e JWT_SECRET
npm run typecheck
npm test
```

Não há servidor HTTP local incluso (é uma função pura `handler(event)`); para testar ponta a ponta, use `sam local` / `aws lambda invoke` apontando pro pacote, ou os testes unitários em `tests/handler.test.ts`, que exercitam o handler diretamente.

## Deploy

1. Gerar o pacote: `npm run package` → cria `function.zip` na raiz.
2. `cd infra && terraform init`
3. Definir as variáveis obrigatórias (não têm default, por serem sensíveis):

   ```bash
   export TF_VAR_lab_role_arn="arn:aws:iam::<account-id>:role/LabRole"
   export TF_VAR_database_url="postgresql://usuario:senha@<rds-endpoint>:5432/mecanica_db"
   export TF_VAR_jwt_secret="<o mesmo valor de k8s/secret.yaml na API principal>"
   ```

4. `terraform apply`
5. `terraform output api_endpoint` → é a base URL a configurar no API Gateway/front-end (`<endpoint>/auth/cpf`).

O pipeline (`../.github/workflows/lambda-pipeline.yml`, filtrado por mudanças em `lambda/**`) faz os passos 1–4 automaticamente a cada push em `main`, usando os secrets do repositório: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (sessão temporária do AWS Academy, mesma usada pelo pipeline da API principal), `LAB_ROLE_ARN`, `DATABASE_URL`, `JWT_SECRET`.

**RDS em VPC privada:** se o banco gerenciado não aceitar acesso público, defina `vpc_id`/`subnet_ids` no Terraform para a Lambda rodar dentro da VPC, e libere o security group criado (`lambda_security_group_id` no output) como origem no security group do RDS.

## Arquitetura deste repositório

```
API Gateway (HTTP API)
   └─ rota POST /auth/cpf ──AWS_PROXY──▶ Lambda (Node.js 20)
                                            └─ pg.Pool ──▶ RDS PostgreSQL (tabela clients)
```

Repassa `x-request-id` do contexto do Gateway (`$context.requestId`) para a Lambda, mantendo a correlação de logs com a API principal (ver `docs/observabilidade.md` naquele repositório).

## Testes

```bash
npm test
```

Cobre validação de CPF (dígitos verificadores, sequências repetidas, máscara) e os caminhos do handler (CPF inválido, cliente inexistente, cliente inativo, sucesso).
