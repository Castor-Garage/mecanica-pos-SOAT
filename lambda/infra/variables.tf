variable "aws_region" {
  description = "Regiao AWS do Learner Lab (confira no painel 'AWS Details' do Academy)"
  type        = string
  default     = "us-east-1"
}

variable "function_name" {
  description = "Nome da funcao Lambda"
  type        = string
  default     = "castor-garage-auth-cpf"
}

variable "api_name" {
  description = "Nome do HTTP API (API Gateway)"
  type        = string
  default     = "castor-garage-auth-api"
}

variable "lab_role_arn" {
  description = "ARN do LabRole fornecido pela AWS Academy (arn:aws:iam::<account-id>:role/LabRole). Reaproveitado como execution role da Lambda, ja que o Academy nao permite criar IAM roles novas — mesmo padrao usado em mecanica-pos-SOAT/infra/aws."
  type        = string
}

variable "database_url" {
  description = "Connection string do banco gerenciado (RDS) — mesma base da API principal. Ex.: postgresql://usuario:senha@host:5432/mecanica_db"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Mesmo JWT_SECRET configurado na API principal (k8s/secret.yaml) — o token so e aceito pela API se o segredo bater dos dois lados."
  type        = string
  sensitive   = true
}

variable "jwt_expires_in" {
  description = "Validade do token emitido"
  type        = string
  default     = "8h"
}

variable "cors_origin" {
  description = "Origem liberada no header CORS da resposta"
  type        = string
  default     = "*"
}

variable "function_zip_path" {
  description = "Caminho do pacote da Lambda gerado por `npm run package` (../function.zip)"
  type        = string
  default     = "../function.zip"
}

variable "vpc_id" {
  description = "VPC onde a Lambda deve rodar para alcancar o RDS (VPC default do Academy, normalmente). Deixe em branco para rodar a Lambda fora de VPC (so funciona se o RDS aceitar acesso publico)."
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "Subnets para a Lambda, quando vpc_id for definido."
  type        = list(string)
  default     = []
}
