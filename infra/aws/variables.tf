variable "cluster_name" {
  description = "Nome do cluster EKS provisionado na AWS Academy"
  type        = string
  default     = "castor-garage"
}

variable "aws_region" {
  description = "Regiao AWS do Learner Lab (confira no painel 'AWS Details' do Academy)"
  type        = string
  default     = "us-east-1"
}

variable "lab_role_arn" {
  description = "ARN do LabRole fornecido pela AWS Academy (arn:aws:iam::<account-id>:role/LabRole). Reaproveitado como cluster role e node role do EKS, ja que o Academy nao permite criar IAM roles novas."
  type        = string
}

variable "instance_type" {
  description = "Tipo de instancia EC2 dos nodes do EKS"
  type        = string
  default     = "t3.medium"
}

variable "desired_size" {
  description = "Quantidade inicial de nodes do node group"
  type        = number
  default     = 2
}

variable "min_size" {
  description = "Minimo de nodes do node group"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximo de nodes do node group"
  type        = number
  default     = 3
}

variable "eks_supported_azs" {
  description = "Availability Zones da regiao que suportam control plane de EKS nesta conta. Algumas AZs mais antigas (ex.: us-east-1e) nao suportam e derrubam o aws_eks_cluster com UnsupportedAvailabilityZoneException — ajuste esta lista conforme a mensagem de erro, se acontecer de novo em outra conta/regiao."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d", "us-east-1f"]
}

variable "k8s_dir" {
  description = "Caminho para os manifestos Kubernetes de infraestrutura (namespace, configmap, secret, postgres). Os manifestos da API (k8s/api) NAO sao aplicados por aqui — isso e responsabilidade do pipeline de CI/CD."
  type        = string
  default     = "../../k8s"
}
