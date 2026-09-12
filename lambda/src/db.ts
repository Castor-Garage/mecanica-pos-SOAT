// Consulta direta via `pg`, sem Prisma Client: o binary engine do Prisma
// (query engine nativo) complica empacotamento e cold start em Lambda —
// nesse contexto (uma única query de leitura) um client fino é mais simples
// e mais rápido de subir. O schema é o mesmo do banco gerenciado usado pela
// API principal (tabela `clients`, ver mecanica-pos-SOAT/prisma/schema.prisma).
import { Pool } from 'pg'

export type ClientStatus = 'ATIVO' | 'INATIVO' | 'BLOQUEADO'

export type ClientRecord = {
  id: string
  name: string
  status: ClientStatus
}

let pool: Pool | undefined

// Reaproveita a conexão entre invocações (execution context reuse do Lambda)
// em vez de abrir um Pool novo a cada chamada.
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      // RDS do Academy fica atrás de um security group liberado só para a
      // Lambda/EKS; SSL segue o padrão do provedor gerenciado.
      ssl: process.env.DATABASE_SSL === 'false' ? undefined : { rejectUnauthorized: false },
    })
  }
  return pool
}

// Cliente ativo, com CPF como documento e não deletado (soft delete).
// Mesmas condições que a API principal usa pra decidir quem pode logar.
export async function findActiveClientByCpf(cpf: string): Promise<ClientRecord | null> {
  const result = await getPool().query<ClientRecord>(
    `select id, name, status
       from clients
      where document = $1
        and document_type = 'CPF'
        and deleted_at is null
      limit 1`,
    [cpf],
  )
  return result.rows[0] ?? null
}
