# RFC 0003 — Estratégia de autenticação do cliente por CPF

- **Status**: Aceito
- **Autores**: Time Castor Garage
- **Relacionado a**: `src/domain/client/value-objects/CPF.ts`, `src/infrastructure/http/middlewares/auth.middleware.ts`, `src/shared/types/jwt.d.ts`

## Contexto

A Fase 3 exige proteger rotas sensíveis com autenticação via CPF, através
de uma Function Serverless que valida o CPF, consulta existência/status do
cliente e devolve um JWT. A API principal (Fastify) já tem toda a
autenticação de **administrador** implementada com `@fastify/jwt`
(`role: 'admin'`) e já espera, por design, um segundo tipo de token para
clientes: o middleware `requireRole`/`assertOrderAccess` e o tipo
`AuthUser` (`src/shared/types/jwt.d.ts`) já modelam `role: 'client'`, e há
comentários explícitos no código apontando para "a Lambda de autenticação
por CPF (repositório separado, Fase 3)".

## Alternativas consideradas

| Opção | Prós | Contras |
|---|---|---|
| **CPF como credencial única, Lambda emite JWT HS256 com segredo compartilhado** (escolhida) | Reaproveita 100% do `@fastify/jwt` já configurado na API — zero mudança na verificação do token pelo app; CPF já é validado e armazenado (`CPF.isValid`, `Client.document`); alinhado ao requisito literal do desafio | Cliente não tem "senha" de fato — qualquer um que saiba o CPF de um cliente ativo consegue um token. Mitigado pelo escopo: o token só dá acesso às próprias OS do cliente (`assertOrderAccess`), sem dados sensíveis adicionais expostos |
| Emitir JWT assimétrico (RS256) via emissor OIDC (ex.: Cognito) | Permite usar o **JWT authorizer nativo** do API Gateway (sem Lambda authorizer customizada); mais "padrão de mercado" | Exigiria migrar a verificação da API principal de `@fastify/jwt` (HS256) para validação de JWKS, reescrevendo o middleware já testado; Cognito é outro serviço gerenciado a provisionar e configurar, sem ganho de requisito (o desafio não pede OIDC) |
| CPF + senha (fluxo tradicional) | Mais "seguro" no sentido convencional | Não é o que o desafio pede ("autenticação via CPF"); exigiria cadastro de senha para clientes existentes, fora de escopo |

## Decisão

1. Function Serverless (`castor-garage-auth-lambda`) recebe `POST /auth/cpf { cpf }`.
2. Valida formato via a mesma lógica de `CPF.isValid` (portada, zero dependências de framework).
3. Consulta `clients` por `document`; recusa (`404`) se não existe, recusa (`403`) se `status != 'ATIVO'`.
4. Assina JWT `{ sub: client.id, role: 'client' }`, HS256, mesmo `JWT_SECRET`/`JWT_EXPIRES_IN` da API principal (distribuídos via SSM Parameter Store) — o app existente valida esse token **sem nenhuma alteração de código**.
5. No API Gateway, uma segunda Lambda (`jwtAuthorizer`, tipo REQUEST) valida o mesmo token antes de rotear para o backend — camada extra de defesa, não substitui a verificação que a API já faz.

## Consequências

- O contrato de claims (`sub`, `role`, ausência de `email` para clientes) é a integração crítica entre repo 1 e repo 4 — qualquer mudança em `src/shared/types/jwt.d.ts` precisa ser replicada na Lambda.
- `JWT_SECRET` passa a ser um segredo compartilhado entre dois sistemas geridos por equipes/repos diferentes — motivo pelo qual vai para SSM Parameter Store (`SecureString`) em vez de continuar hardcoded em `k8s/secret.yaml`.
- Cliente `INATIVO`/`BLOQUEADO` nunca recebe token novo, mas um token já emitido continua válido até expirar (`JWT_EXPIRES_IN`, default 8h) — trade-off aceito (mesma limitação que já existe para admins).
