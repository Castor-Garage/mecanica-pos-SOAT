terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Configure via -backend-config flags ou variaveis de ambiente antes do terraform init
    # Exemplo:
    #   terraform init \
    #     -backend-config="bucket=SEU-BUCKET-TERRAFORM-STATE" \
    #     -backend-config="key=mecanica/terraform.tfstate" \
    #     -backend-config="region=us-east-1"
  }
}

provider "aws" {
  region = var.region
}
