# Infraestrutura (Terraform)

Provisiona, localmente, tudo que a aplicação precisa **antes** do deploy da
API em si:

1. **Cluster Kubernetes local** (`kind`), com a porta `30080` do host
   mapeada para o node (para o `NodePort` da API funcionar sem
   `kubectl port-forward`).
2. **metrics-server** — sem ele o HPA (`k8s/api/hpa.yaml`) não consegue ler
   uso de CPU/memória e não escala.
3. **Banco de dados** — aplica `k8s/namespace.yaml`, `k8s/configmap.yaml`,
   `k8s/secret.yaml` e `k8s/postgres/*.yaml` (os manifestos existentes são a
   fonte única de verdade; o Terraform só orquestra a aplicação deles).

Este módulo **não** faz deploy da API (`k8s/api/*`) — isso é feito depois,
manualmente ou pelo job `deploy` do pipeline de CI/CD (veja o README
principal), para manter "provisionar infraestrutura" separado de "publicar
uma nova versão da aplicação".

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) rodando
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5

## Uso

```bash
cd infra
terraform init
terraform apply
```

Ao final, o cluster `castor-garage` está no ar com o banco de dados
provisionado. Para publicar a API:

```bash
kubectl apply -f ../k8s/api/
kubectl -n castor-garage rollout status deployment/castor-garage-api
```

API disponível em `http://localhost:30080` (Swagger em `/docs`, health em
`/health`).

## Destruir tudo

```bash
terraform destroy
```

Remove o namespace `castor-garage` (banco de dados incluído) e apaga o
cluster kind por completo.

## O que cada arquivo faz

| Arquivo | Recurso |
|---|---|
| `main.tf` | 3 recursos (`null_resource`) que criam o cluster kind, instalam o metrics-server e aplicam os manifestos de banco de dados |
| `kind-config.yaml` | Configuração do cluster kind (port mapping 30080) |
| `manifests/metrics-server.yaml` | Manifest oficial do metrics-server, com `--kubelet-insecure-tls` adicionado (exigido pelo kind) |
| `variables.tf` | `cluster_name` e `k8s_dir` (caminho para os manifestos reaproveitados de `/k8s`) |
| `outputs.tf` | Nome do cluster, contexto kubectl e URL da API |
