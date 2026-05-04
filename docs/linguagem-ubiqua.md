# Linguagem Ubiqua - Oficina do Castor

Glossario do dominio da Oficina Mecanica. Todos os termos abaixo sao usados de forma consistente no codigo-fonte, nas conversas de equipe e nos documentos do projeto.

---

## Cliente (Client)

Pessoa fisica (CPF) ou juridica (CNPJ) que traz veiculos para a oficina. Pode ser inativado (soft delete) sem remocao do banco de dados. Campos principais: nome, documento (CPF ou CNPJ), telefone, e-mail, endereco.

- **CPF** - Cadastro de Pessoa Fisica. Validado com digitos verificadores. Armazenado sem pontos/tracas.
- **CNPJ** - Cadastro Nacional de Pessoa Juridica. Validado com digitos verificadores. Armazenado sem pontos/tracas/barra.
- **Documento** - termo generico que abrange CPF ou CNPJ do cliente.

---

## Veiculo (Vehicle)

Automovel pertencente a um cliente. Identificado pela placa. Pode ser inativado (soft delete).

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

---

## Administrador (Admin)

Usuario do sistema com acesso total as funcionalidades da API. Autenticado via e-mail e senha (hash bcrypt). Recebe um JWT (JSON Web Token) valido por 8 horas.

- **JWT** - token de autenticacao retornado no login; deve ser enviado no header Authorization: Bearer <token>.

---

## Contextos Delimitados (Bounded Contexts)

| Contexto | Responsabilidade |
|---|---|
| Gestao de Clientes | CRUD de clientes, validacao de CPF/CNPJ, soft delete. |
| Gestao de Veiculos | CRUD de veiculos, validacao de placa, vinculo com cliente. |
| Catalogo de Servicos | CRUD de servicos oferecidos pela oficina. |
| Controle de Estoque | CRUD de pecas, controle de estoque minimo, baixa de estoque. |
| Ordens de Servico | Criacao de OS, gestao do ciclo de vida, orcamento, estatisticas. |
| Autenticacao | Login de administradores, emissao e validacao de JWT. |
