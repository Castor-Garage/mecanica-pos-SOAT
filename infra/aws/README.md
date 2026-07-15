# Infraestrutura na AWS Academy (EKS)

Provisiona, na conta do **AWS Academy Learner Lab**, tudo que a aplicação
precisa **antes** do deploy da API em si:

1. **Cluster EKS + node group**, reaproveitando o `LabRole` já existente na
   conta como cluster role e node role — o Academy não permite criar IAM
   roles novas, então em vez de criar uma role dedicada, o mesmo ARN do
   `LabRole` é usado nos dois lugares. É o workaround padrão para rodar EKS
   dentro do Academy.
2. **Tags de descoberta de subnet** (`kubernetes.io/cluster/<nome>` e
   `kubernetes.io/role/elb`) nas subnets da VPC default — sem elas o Service
   `LoadBalancer` da API (`k8s/api/service.yaml`) fica preso em "pending"
   porque o controller do EKS não sabe em qual subnet criar o Network Load
   Balancer.
3. **metrics-server** — sem ele o HPA (`k8s/api/hpa.yaml`) não consegue ler
   uso de CPU/memória e não escala.
4. **Banco de dados** — aplica `k8s/namespace.yaml`, `k8s/configmap.yaml`,
   `k8s/secret.yaml` e `k8s/postgres/*.yaml` (os manifestos existentes são a
   fonte única de verdade; o Terraform só orquestra a aplicação deles).

Este módulo **não** faz deploy da API (`k8s/api/*`) — isso é feito pelo job
`deploy` do pipeline de CI/CD (`.github/workflows/pipeline.yml`) a cada push
em `main`, contra o cluster que este módulo já deixou no ar.

> Este módulo é independente do `infra/` (que provisiona um cluster `kind`
> local). Use este aqui só quando precisar de um ambiente real na AWS —
> por exemplo, para gravar o vídeo demonstrativo do Tech Challenge.

## Por que o cluster não é criado/destruído a cada push

Diferente do módulo local (`kind`, que sobe/derruba em segundos), criar e
destruir um cluster EKS leva de 15 a 25 minutos em cada sentido. Fazer isso
em toda execução da pipeline seria lento e gastaria à toa o tempo/orçamento
limitado do Learner Lab. Por isso o fluxo aqui é:

1. Você roda `terraform apply` **uma vez**, manualmente, deixando o cluster
   no ar.
2. A cada push em `main`, o pipeline só publica a nova imagem no cluster já
   existente (sem recriar nada).
3. Quando terminar de gravar o vídeo / usar o ambiente, rode
   `terraform destroy` para não deixar recursos cobrando na conta do Lab.

## Pré-requisitos

- Sessão ativa do [AWS Academy Learner Lab](https://awsacademy.instructure.com/)
  com o botão **Start Lab** clicado (as credenciais só existem enquanto o
  Lab está rodando).
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configurado com as credenciais temporárias da sessão.
- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5

## Onde pegar as credenciais e o LabRole

No painel do Learner Lab, clique em **AWS Details** → **Show** ao lado de
"AWS CLI":

```ini
[default]
aws_access_key_id=...
aws_secret_access_key=...
aws_session_token=...
```

Exporte essas 3 variáveis no seu terminal (ou salve em `~/.aws/credentials`):

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...
export AWS_REGION=us-east-1   # confira a região no mesmo painel
```

O ARN do `LabRole` segue o padrão `arn:aws:iam::<account-id>:role/LabRole` —
o Account ID também aparece no painel "AWS Details". Também dá pra confirmar
rodando `aws sts get-caller-identity` (o Account ID vem no campo `Account`).

**Essas credenciais expiram em poucas horas** (sessão temporária do Lab). Se
expirar no meio do trabalho, é só rodar `Start Lab` de novo, pegar as novas
credenciais e repetir os exports.

## Uso

```bash
cd infra/aws
terraform init
terraform apply -var="lab_role_arn=arn:aws:iam::<account-id>:role/LabRole"
```

Ao final, o cluster `castor-garage` está no ar na AWS, com o banco de dados
provisionado. Para publicar a API manualmente (sem esperar o CI/CD):

```bash
aws eks update-kubeconfig --name castor-garage --region us-east-1 --alias castor-garage
kubectl --context castor-garage apply -f ../../k8s/api/
kubectl --context castor-garage -n castor-garage rollout status deployment/castor-garage-api
kubectl --context castor-garage -n castor-garage get svc castor-garage-api
```

A API fica disponível em `http://<hostname-do-load-balancer>:3000` (o
hostname aparece na coluna `EXTERNAL-IP` do `get svc`, pode levar alguns
minutos para o Network Load Balancer da AWS ficar pronto). Swagger em
`/docs`, health em `/health`.

## Configurar o GitHub Actions para publicar automaticamente

Em **Settings → Secrets and variables → Actions** do repositório, crie:

| Secret | Valor |
|---|---|
| `AWS_ACCESS_KEY_ID` | da sessão do Learner Lab |
| `AWS_SECRET_ACCESS_KEY` | da sessão do Learner Lab |
| `AWS_SESSION_TOKEN` | da sessão do Learner Lab |

O nome do cluster e a região já estão fixos em
`.github/workflows/pipeline.yml` (`EKS_CLUSTER` e `AWS_REGION`) — ajuste ali
se usar valores diferentes.

Como as credenciais são temporárias, **atualize esses 3 secrets toda vez que
reiniciar a sessão do Lab**, antes de dar push/rodar a pipeline de novo.

## Imagem no GHCR

O cluster EKS puxa a imagem de verdade do GitHub Container Registry (ao
contrário do `kind` local, que carrega a imagem direto sem precisar de rede).
O pacote `ghcr.io/castor-garage/mecanica-pos-soat` está configurado como
**público** (Organization → Settings → Packages → "Public" habilitado em
Package creation, depois Change visibility no pacote), então o EKS puxa sem
precisar de credencial nenhuma — `k8s/api/deployment.yaml` não usa
`imagePullSecrets`.

Se um dia o pacote voltar a ser privado, o pod passa a falhar com
`ImagePullBackOff` — nesse caso, a alternativa é criar um
`imagePullSecrets` no cluster com um Personal Access Token `read:packages` e
referenciar em `k8s/api/deployment.yaml`.

## Destruir tudo

```bash
cd infra/aws
terraform destroy -var="lab_role_arn=arn:aws:iam::<account-id>:role/LabRole"
```

## Risco conhecido

Reaproveitar o `LabRole` como cluster role e node role do EKS só funciona se
a trust policy do `LabRole` permitir ser assumido pelos serviços
`eks.amazonaws.com` e `ec2.amazonaws.com` — isso varia conforme a
configuração do curso na Academy e não pode ser alterado por vocês (não é
possível editar a trust policy do `LabRole`). Se o `terraform apply` travar
na criação do `aws_eks_cluster` por erro de permissão/trust policy, esse é o
motivo — nesse caso a alternativa é provisionar um EC2 com `k3s` no lugar do
EKS.
