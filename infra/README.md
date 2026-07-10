# Infra — AWS EKS + RDS com Terraform

Provisiona VPC, EKS (cluster + node group) e RDS PostgreSQL 16 na AWS.

## Pré-requisitos

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.6
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configurado (`aws configure`)
- Bucket S3 para o Terraform state (crie antes do `init`)

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `db_password` | Senha do RDS PostgreSQL (sensível) |
| `region` | Região AWS (default: `us-east-1`) |
| `cluster_name` | Nome do cluster EKS (default: `mecanica-eks`) |

## Inicializar

```bash
terraform init \
  -backend-config="bucket=SEU-BUCKET-TERRAFORM-STATE" \
  -backend-config="key=mecanica/terraform.tfstate" \
  -backend-config="region=us-east-1"
```

## Aplicar

```bash
terraform plan -var="db_password=SuaSenhaSegura"
terraform apply -var="db_password=SuaSenhaSegura"
```

## Configurar kubectl após apply

```bash
aws eks update-kubeconfig --region us-east-1 --name mecanica-eks
```

## Outputs relevantes

- `cluster_endpoint` — endpoint da API do EKS
- `rds_endpoint` — endpoint do RDS (usar no `DATABASE_URL` do Secret K8s)
- `kubeconfig_command` — comando pronto para configurar o kubectl

## Destruir

```bash
terraform destroy -var="db_password=SuaSenhaSegura"
```
