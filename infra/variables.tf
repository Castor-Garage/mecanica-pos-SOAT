variable "cluster_name" {
  description = "Nome do cluster kind provisionado localmente"
  type        = string
  default     = "castor-garage"
}

variable "k8s_dir" {
  description = "Caminho para os manifestos Kubernetes de infraestrutura (namespace, configmap, secret, postgres). Os manifestos da API (k8s/api) NAO sao aplicados por aqui — isso e responsabilidade do pipeline de CI/CD."
  type        = string
  default     = "../k8s"
}
