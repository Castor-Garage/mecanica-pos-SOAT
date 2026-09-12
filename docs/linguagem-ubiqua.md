# Linguagem Ubiqua - Oficina do Castor

Glossario do dominio da Oficina Mecanica. Todos os termos abaixo sao usados de forma consistente no codigo-fonte, nas conversas de equipe e nos documentos do projeto.

---

## Cliente (Client)

Pessoa fisica (CPF) ou juridica (CNPJ) que traz veiculos para a oficina. Pode ser removido logicamente (soft delete via `deletedAt`) sem remocao do banco de dados. Campos principais: nome, documento (CPF ou CNPJ), telefone, e-mail, endereco, status.

- **CPF** - Cadastro de Pessoa Fisica. Validado com digitos verificadores. Armazenado sem pontos/tracas. E a credencial usada para autenticacao do cliente na Fase 3 (ver **Autenticacao por CPF** abaixo).
- **CNPJ** - Cadastro Nacional de Pessoa Juridica. Validado com digitos verificadores. Armazenado sem pontos/tracas/barra.
- **Documento** - termo generico que abrange CPF ou CNPJ do cliente.
- **Status do Cliente** (`ClientStatus`) - enum com 3 valores, controla se o cliente pode se autenticar e operar na API:

| Status | Significado |
|---|---|
| ATIVO | Cliente em situacao normal; unico status que recebe token de autenticacao (admin ou Lambda de CPF). |
| INATIVO | Cliente desativado administrativamente; autenticacao recusada (403). |
| BLOQUEADO | Cliente bloqueado (ex.: inadimplencia, fraude suspeita); autenticacao recusada (403). |

O status por si so nao remove o registro (isso e papel do `deletedAt`); um cliente pode estar `ATIVO` e ainda assim ter sido removido logicamente.

---

## Veiculo (Vehicle)

Automovel pertencente a um cliente. Identificado pela placa. Pode ser removido logicamente (soft delete via `deletedAt`).

- **Placa** (LicensePlate) - identificador unico do veiculo. Aceita formato antigo (ABC-1234) e Mercosul (ABC1D23).
- **Marca** - fabricante do veiculo (ex.: Toyota, Ford).
- **Modelo** - linha do veiculo (ex.: Corolla, Ka).
- **Ano** - ano de fabricacao.
- **Cor** - cor predominante do veiculo.

---

## Servico (Service)

Tipo de trabalho prestado pela oficina, como "Troca de oleo", "Alinhamento" ou "Diagnostico eletronico". Possui preco unitario e pode ser inativado.

- **Preco unitario** (unitPrice) - valor cobrado por execucao do servico.
- **Servico ativo / inativo** - servicos inativos nao podem ser adicionados a novas OS.

---

## Peca (Part)

Componente ou insumo utilizado nos reparos (ex.: filtro de oleo, pastilha de freio). Controlado por estoque.

- **Estoque atual** (stockQuantity) - quantidade disponivel em armazem.
- **Estoque minimo** (minStock) - nivel abaixo do qual o sistema emite alerta.
- **Unidade** (unit) - unidade de medida (ex.: "un", "L", "kg").
- **Baixa de estoque** - reducao automatica do stockQuantity quando a peca e vinculada a uma OS.

---

## Ordem de Servico (ServiceOrder / OS)

Documento central do dominio. Registra o ciclo de vida completo de um atendimento, da recepcao do veiculo ate a entrega ao cliente.

- **Numero da OS** (orderNumber) - identificador sequencial legivel (ex.: OS-2024-001).
- **Descricao do problema** (problemDescription) - relato inicial do cliente sobre a falha ou solicitacao.
- **Diagnostico** (diagnosis) - parecer tecnico do mecanico apos inspecao.
- **Notas do tecnico** (technicianNotes) - observacoes adicionais registradas durante a execucao.

### Itens da OS

- **Item de servico** (ServiceOrderItem) - servico incluso na OS com quantidade e preco unitario no momento da abertura.
- **Item de peca** (ServiceOrderPart) - peca inclusa na OS com quantidade e preco unitario no momento da abertura.

---

## Orcamento (Quote)

Estimativa do custo total da OS, calculada automaticamente como a soma dos servicos e pecas vinculados. Deve ser aprovado ou rejeitado pelo cliente antes da execucao.

- **Valor total do orcamento** (quoteTotalAmount) - soma de todos os itens de servico e pecas.
- **Aprovacao do orcamento** (quoteApprovedAt) - timestamp de aprovacao pelo cliente; libera a OS para execucao.
- **Rejeicao do orcamento** (quoteRejectedAt) - timestamp de rejeicao; encerra a OS sem execucao.

---

## Status da OS (OSStatus)

Enum que controla o ciclo de vida da OS. As transicoes sao unicas e ordenadas, nao e possivel pular etapas ou retroceder.

| Status | Rotulo | Descricao |
|---|---|---|
| RECEBIDA | Recebida | Veiculo recebido; OS criada. |
| EM_DIAGNOSTICO | Em diagnostico | Mecanico inspecionando o veiculo. |
| AGUARDANDO_APROVACAO | Aguardando aprovacao | Orcamento enviado ao cliente para aprovacao. |
| EM_EXECUCAO | Em execucao | Reparos em andamento (orcamento aprovado). |
| FINALIZADA | Finalizada | Reparos concluidos; aguardando retirada. |
| ENTREGUE | Entregue | Veiculo devolvido ao cliente. Status terminal. |

**Transicoes validas:**
RECEBIDA -> EM_DIAGNOSTICO -> AGUARDANDO_APROVACAO -> EM_EXECUCAO -> FINALIZADA -> ENTREGUE

- **Historico de Status** (`OSStatusHistory`) - registro de auditoria de cada transicao de status de uma OS: status de origem (`fromStatus`, nulo na primeira transicao), status de destino (`toStatus`), momento da mudanca (`changedAt`), autor (`changedBy`, quando aplicavel) e observacoes (`notes`). E a fonte do dashboard "tempo medio de execucao por status" (Fase 3): o tempo em cada status e calculado pela diferenca entre `changedAt` de transicoes consecutivas da mesma OS.

---

## Administrador (Admin)

Usuario do sistema com acesso total as funcionalidades da API. Autenticado via e-mail e senha (hash bcrypt). Recebe um JWT (JSON Web Token) valido por 8 horas.

- **JWT** - token de autenticacao retornado no login; deve ser enviado no header Authorization: Bearer <token>.

---

## Autenticacao por CPF (Fase 3)

Cliente `ATIVO` se autentica informando apenas o CPF, sem senha - o CPF valido e cadastrado ja e a credencial. O fluxo roda fora da API principal, numa Function Serverless (AWS Lambda) dedicada, atras de um API Gateway:

1. Cliente envia o CPF (com ou sem pontuacao) para a rota publica de autenticacao da Lambda.
2. Lambda valida o formato/digitos verificadores do CPF.
3. Lambda consulta a existencia e o **Status do Cliente** na base de dados pelo `document`.
4. Lambda emite um JWT (`sub` = id do cliente, `role: client`) assinado com o mesmo segredo (`JWT_SECRET`) que a API principal usa para validar - o token funciona nas rotas protegidas sem nenhuma mudanca na API.
5. Cliente usa o JWT no header `Authorization: Bearer <token>` para consumir as rotas protegidas (ex.: acompanhar suas proprias OS).

So cliente com status `ATIVO` recebe token; `INATIVO`/`BLOQUEADO` sao recusados. Ver `docs/rfc/0003-estrategia-de-autenticacao.md` para a justificativa completa da escolha.

---

## Contextos Delimitados (Bounded Contexts)

| Contexto | Responsabilidade |
|---|---|
| Gestao de Clientes | CRUD de clientes, validacao de CPF/CNPJ, status (ATIVO/INATIVO/BLOQUEADO), soft delete. |
| Gestao de Veiculos | CRUD de veiculos, validacao de placa, vinculo com cliente. |
| Catalogo de Servicos | CRUD de servicos oferecidos pela oficina. |
| Controle de Estoque | CRUD de pecas, controle de estoque minimo, baixa de estoque. |
| Ordens de Servico | Criacao de OS, gestao do ciclo de vida, historico de status, orcamento, estatisticas. |
| Autenticacao (Admin) | Login de administradores por e-mail/senha, emissao e validacao de JWT. |
| Autenticacao (Cliente) | Function Serverless de autenticacao por CPF (repositorio separado), emissao de JWT validado pela API principal. |
