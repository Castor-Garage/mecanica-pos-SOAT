output "api_endpoint" {
  description = "URL base do HTTP API. O endpoint de autenticacao e <valor>/auth/cpf"
  value       = aws_apigatewayv2_api.this.api_endpoint
}

output "lambda_function_name" {
  value = aws_lambda_function.auth_cpf.function_name
}

output "lambda_security_group_id" {
  description = "So existe quando vpc_id foi definido. Adicione como origem permitida no security group do RDS."
  value       = local.use_vpc ? aws_security_group.lambda[0].id : null
}
