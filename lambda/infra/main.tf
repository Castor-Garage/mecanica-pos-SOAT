# Provisiona a Function Serverless de autenticacao por CPF e o API Gateway
# (HTTP API) que a expoe publicamente, seguindo o mesmo padrao AWS Academy
# usado em mecanica-pos-SOAT/infra/aws (LabRole reaproveitado como execution
# role, nada de IAM role nova, credenciais via variaveis de ambiente padrao
# AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN).
#
# Pre-requisito: `npm run package` na raiz do repo, que gera ../function.zip
# a partir de src/handler.ts (ver package.json).

locals {
  use_vpc = var.vpc_id != ""
}

# Necessaria so quando a Lambda roda dentro da VPC (para alcancar um RDS
# privado). Libera todo trafego de saida; a entrada no RDS e controlada pelo
# security group do banco (adicionar esta SG como origem la).
resource "aws_security_group" "lambda" {
  count       = local.use_vpc ? 1 : 0
  name        = "${var.function_name}-sg"
  description = "Egress da Lambda de autenticacao por CPF"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lambda_function" "auth_cpf" {
  function_name = var.function_name
  role          = var.lab_role_arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"

  filename         = var.function_zip_path
  source_code_hash = filebase64sha256(var.function_zip_path)

  timeout     = 10
  memory_size = 256

  environment {
    variables = {
      DATABASE_URL   = var.database_url
      JWT_SECRET     = var.jwt_secret
      JWT_EXPIRES_IN = var.jwt_expires_in
      CORS_ORIGIN    = var.cors_origin
    }
  }

  dynamic "vpc_config" {
    for_each = local.use_vpc ? [1] : []
    content {
      subnet_ids         = var.subnet_ids
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }
}

resource "aws_cloudwatch_log_group" "auth_cpf" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14
}

resource "aws_apigatewayv2_api" "this" {
  name          = var.api_name
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [var.cors_origin]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["content-type"]
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
}

# Repassa o request id do Gateway para a Lambda no header x-request-id, para
# a mesma correlacao de logs (requestId) usada na API principal — ver
# mecanica-pos-SOAT/docs/observabilidade.md.
resource "aws_apigatewayv2_integration" "auth_cpf" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth_cpf.invoke_arn
  payload_format_version = "2.0"

  request_parameters = {
    "overwrite:header.x-request-id" = "$context.requestId"
  }
}

resource "aws_apigatewayv2_route" "auth_cpf" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "POST /auth/cpf"
  target    = "integrations/${aws_apigatewayv2_integration.auth_cpf.id}"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_cpf.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}
