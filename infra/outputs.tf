output "cluster_name" {
  description = "Nome do cluster kind provisionado"
  value       = var.cluster_name
}

output "kubectl_context" {
  description = "Contexto kubectl a usar para falar com o cluster"
  value       = local.kube_context
}

output "api_url" {
  description = "URL da API depois que k8s/api/ for aplicado (NodePort 30080 mapeado pelo kind)"
  value       = "http://localhost:30080"
}
