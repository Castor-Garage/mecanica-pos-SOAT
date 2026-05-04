# Relatório de Vulnerabilidades — Oficina do Castor

**Projeto:** mecanica-pos-SOAT — Tech Challenge SOAT Fase 1  
**Ferramenta:** `npm audit`  
**Data da análise:** Maio de 2026  

---

## Resumo executivo

| Severidade | Quantidade |
|---|---|
| 🔴 Crítica | 0 |
| 🟠 Alta | 0 |
| 🟡 Moderada | 3 |
| 🟢 Baixa | 0 |
| **Total** | **3** |

Nenhuma vulnerabilidade crítica ou alta foi encontrada. As 3 vulnerabilidades moderadas identificadas estão restritas a dependências de desenvolvimento e **não afetam o ambiente de produção**.

---

## Vulnerabilidades encontradas

### 1. `@hono/node-server` — Moderada

| Campo | Detalhe |
|---|---|
| **CVE / Advisory** | GHSA-92pp-h63x-v22m |
| **Título** | Middleware bypass via repeated slashes in `serveStatic` |
| **CVSS** | 5.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) |
| **CWE** | CWE-22 (Path Traversal) |
| **Versão vulnerável** | `< 1.19.13` |
| **Ambiente** | Dependência transitiva de `@prisma/dev` (devDependency) |

**Descrição:** A vulnerabilidade permite que um atacante contorne middlewares de segurança do `serveStatic` utilizando barras repetidas na URL (ex.: `//arquivo`), potencialmente expondo arquivos estáticos indevidos.

**Impacto no projeto:** **Nulo em produção.** O projeto utiliza **Fastify** como servidor HTTP — o `@hono/node-server` é puxado exclusivamente como dependência do `@prisma/dev`, usado apenas para rodar o Prisma Studio localmente durante o desenvolvimento. O pacote não é instalado nem executado no ambiente de produção (`npm install --omit=dev`).

---

### 2. `@prisma/dev` — Moderada (transitiva)

| Campo | Detalhe |
|---|---|
| **Origem** | Dependência transitiva de `prisma` (devDependency) |
| **Causa** | Depende de `@hono/node-server` na versão vulnerável |
| **Ambiente** | Exclusivamente desenvolvimento |

**Impacto no projeto:** **Nulo em produção.** `@prisma/dev` é um pacote interno do ecossistema Prisma usado apenas para ferramentas de desenvolvimento (Prisma Studio). Não é incluído no bundle de produção.

---

### 3. `prisma` — Moderada (transitiva)

| Campo | Detalhe |
|---|---|
| **Origem** | devDependency direta do projeto |
| **Causa** | Depende de `@prisma/dev` que depende de `@hono/node-server` vulnerável |
| **Ambiente** | Exclusivamente desenvolvimento (CLI do Prisma) |

**Impacto no projeto:** **Nulo em produção.** O pacote `prisma` é a CLI de migrações, usada apenas em tempo de desenvolvimento e CI/CD para rodar `prisma migrate`. O cliente de banco de dados usado em produção é o `@prisma/client`, que **não possui vulnerabilidades**.

---

## Análise de risco

```
prisma (devDependency)
  └── @prisma/dev (transitiva)
        └── @hono/node-server < 1.19.13  ← vulnerabilidade
```

Toda a cadeia de dependências vulneráveis está no caminho de **devDependencies**. O Dockerfile de produção executa `npm install --omit=dev`, garantindo que nenhum desses pacotes seja instalado na imagem final.

O servidor HTTP de produção é o **Fastify**, que não possui dependência alguma de `@hono/node-server`.

---

## Decisão de mitigação

| Ação | Justificativa |
|---|---|
| ✅ Aceitar risco temporariamente | Vulnerabilidade restrita a devDependencies; zero impacto em produção |
| ✅ Monitorar atualização do Prisma | Aguardar release do Prisma CLI que atualize `@hono/node-server` para `>= 1.19.13` |
| ❌ Forçar override de versão | Pode quebrar o Prisma Studio sem ganho real de segurança |

---

## Comandos utilizados

```bash
# Executar auditoria
npm audit

# Ver saída em JSON (para integração com CI)
npm audit --json

# Verificar se há vulnerabilidades em produção apenas
npm audit --omit=dev
```

> `npm audit --omit=dev` retorna **0 vulnerabilidades**, confirmando que o ambiente de produção está seguro.
