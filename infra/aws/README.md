# Infra — AWS EKS + RDS com Terraform (produção)

Provisiona VPC, EKS (cluster + node group) e RDS PostgreSQL 16 na AWS.

Esse é o track de **produção**. Para desenvolvimento/demonstração local, use `infra/` (kind), que é
provisionado automaticamente pelo CI/CD em `.github/workflows/pipeline.yml`. Este diretório (`infra/aws/`)
**não** é tocado pelo pipeline automático — o provisionamento aqui é manual, feito uma vez (ou quando a
infra mudar), não a cada push.

## Pré-requisitos

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.6
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configurado (`aws configure`)
- Uma conta AWS com permissão para criar VPC, EKS (cluster + node groups + IAM roles) e RDS
- Um bucket S3 já existente para o Terraform state (crie antes do `init` — o Terraform não cria o
  próprio bucket de state)

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `db_password` | Senha do RDS PostgreSQL (sensível, sem default — obrigatório informar) |
| `region` | Região AWS (default: `us-east-1`) |
| `cluster_name` | Nome do cluster EKS (default: `mecanica-eks`) |

## Inicializar

```bash
cd infra/aws
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

Isso provisiona: VPC (subnets públicas/privadas + NAT gateway), cluster EKS com node group gerenciado
(2-4 nós `t3.medium`) e uma instância RDS PostgreSQL 16 (`db.t3.micro`), com security group liberando
5432 só a partir dos nós do EKS.

## Configurar kubectl após apply

```bash
aws eks update-kubeconfig --region us-east-1 --name mecanica-eks
```

## Preencher os secrets do Kubernetes

`k8s/aws/secret.yaml` vem com placeholders — gere os valores reais em base64 e substitua antes de aplicar:

```bash
echo -n 'seu-jwt-secret-forte' | base64
echo -n "postgresql://workshop:SuaSenhaSegura@$(terraform output -raw rds_endpoint)/mecanica_db" | base64
```

## Aplicar os manifestos da aplicação

```bash
kubectl apply -f k8s/aws/namespace.yaml
kubectl apply -f k8s/aws/configmap.yaml
kubectl apply -f k8s/aws/secret.yaml
kubectl apply -f k8s/aws/service.yaml
kubectl apply -f k8s/aws/ingress.yaml
kubectl apply -f k8s/aws/hpa.yaml
kubectl apply -f k8s/aws/deployment.yaml
```

> O banco de dados é o RDS provisionado por este Terraform — não há Postgres rodando dentro do
> cluster neste track (diferente do `infra/` local, que sobe um Postgres em pod via kind, já que
> não há um serviço gerenciado disponível localmente).

> `k8s/aws/ingress.yaml` espera um Ingress Controller nginx já instalado no cluster
> (`ingressClassName: nginx`) — instale o [ingress-nginx](https://kubernetes.github.io/ingress-nginx/deploy/)
> separadamente se ainda não tiver um.

## Outputs relevantes

- `cluster_endpoint` — endpoint da API do EKS
- `rds_endpoint` — endpoint do RDS (usar no `DATABASE_URL` do Secret K8s acima)
- `kubeconfig_command` — comando pronto para configurar o kubectl

## Deploy via GitHub Actions

O workflow `.github/workflows/deploy-production.yml` builda a imagem, faz push pro `ghcr.io` e aplica
os manifestos deste diretório contra o cluster EKS já provisionado (ele **não** roda Terraform — assume
que a infra acima já existe). É disparado manualmente (aba Actions → Deploy Production → Run workflow).

Configure estes secrets no repositório GitHub (Settings → Secrets and variables → Actions) antes de
rodar:

| Secret | Valor |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Access key de um usuário/role IAM com permissão de `eks:*` sobre o cluster |
| `AWS_SECRET_ACCESS_KEY` | Secret key correspondente |
| `AWS_REGION` | Mesma região usada no `terraform apply` (ex: `us-east-1`) |
| `EKS_CLUSTER_NAME` | Mesmo valor de `cluster_name` usado no Terraform (default: `mecanica-eks`) |

## Destruir

```bash
terraform destroy -var="db_password=SuaSenhaSegura"
```
