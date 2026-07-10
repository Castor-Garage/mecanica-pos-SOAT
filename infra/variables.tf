variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "mecanica-eks"
}

variable "db_username" {
  description = "RDS PostgreSQL username"
  type        = string
  default     = "workshop"
}

variable "db_password" {
  description = "RDS PostgreSQL password (sensitive)"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "RDS PostgreSQL database name"
  type        = string
  default     = "mecanica_db"
}
