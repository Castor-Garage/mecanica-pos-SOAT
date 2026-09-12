# ADR 0004 — RDS gerenciado em vez de PostgreSQL em cluster

- **Status**: Aceito
- **Relacionado a**: RFC 0002 (banco de dados)

## Contexto

Ver RFC 0002 para a comparação completa de alternativas. Este ADR registra
as decisões de implementação específicas e as limitações conhecidas
aceitas para viabilizar o RDS dentro das restrições do AWS Academy Learner
Lab (ADR/RFC 0001).

## Decisão

- `aws_db_instance`: engine `postgres` 16, `db.t3.micro`, 20GB,
  `storage_encrypted = true`, `skip_final_snapshot = true`,
  `multi_az = false`, `backup_retention_period = 1`.
- **Ingress da security group do RDS por CIDR da VPC default**, não por
  referência cross-stack à security group do EKS. Como o cluster
  (`castor-garage-k8s-infra`) e o banco (`castor-garage-db-infra`) são
  repositórios/states Terraform independentes, referenciar diretamente o
  SG do EKS exigiria acoplar a ordem de build entre os dois repos (via
  `terraform_remote_state` ou output manual). Permitir todo o CIDR da VPC
  default é uma simplificação aceita: em uma conta de estudante com uma
  única VPC default e sem outros workloads, o raio de exposição extra é
  mínimo.
- **Acesso público temporário para a carga inicial**: `publicly_accessible`
  começa `true` (com a SG restrita ao IP do operador) só para rodar
  `prisma migrate deploy` + seed a partir de um laptop, antes de existir
  qualquer computação dentro da VPC. Depois disso, reaplicar com
  `publicly_accessible = false` e sem a regra de IP.
- Sem migração de dado real: base de demonstração é recriada do zero a
  cada ambiente (staging/produção), sem `pg_dump`/restore.

## Alternativas consideradas

- **Security group cross-stack via `terraform_remote_state`** — rejeitado nesta fase: exigiria configurar backend remoto (S3 + DynamoDB) só para esse acoplamento, custo de setup desproporcional ao ganho de segurança nesta conta acadêmica.
- **Bastion host para a carga inicial** (em vez de acesso público temporário) — considerado mais "correto", mas adiciona mais uma instância EC2 para provisionar/derrubar por um passo que acontece uma única vez; o acesso público restrito por IP foi julgado suficiente e mais simples de documentar/repetir.

## Consequências

- Documentar claramente no README do `castor-garage-db-infra` os dois
  momentos do `publicly_accessible` (aberto durante o bootstrap, fechado
  depois) — um esquecimento aqui deixaria o RDS exposto publicamente.
- Se a VPC default algum dia hospedar outro workload não-Castor-Garage, a
  regra de ingress por CIDR passaria a ser excessivamente permissiva —
  reavaliar então.
