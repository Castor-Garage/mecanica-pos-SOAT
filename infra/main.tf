# Provisiona a infraestrutura da Fase 2 sem depender de nuvem:
#   1. Cluster Kubernetes local (kind)
#   2. metrics-server (necessario para o HPA em k8s/api/hpa.yaml funcionar)
#   3. Banco de dados (namespace + configmap + secret + Postgres, a partir dos
#      manifestos existentes em /k8s, reaproveitados como fonte unica de verdade)
#
# Os manifestos da API (k8s/api/*) NAO sao aplicados aqui de proposito: isso e
# o passo "Aplicacao dos manifestos YAML no cluster" do pipeline de CI/CD,
# separado do provisionamento de infraestrutura.

locals {
  kind_config_path         = "${path.module}/kind-config.yaml"
  metrics_server_manifest  = "${path.module}/manifests/metrics-server.yaml"
  kube_context             = "kind-${var.cluster_name}"
}

resource "null_resource" "kind_cluster" {
  triggers = {
    cluster_name = var.cluster_name
    config_hash  = filesha256(local.kind_config_path)
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -e
      if kind get clusters | grep -qx "${var.cluster_name}"; then
        echo "kind cluster '${var.cluster_name}' ja existe, reaproveitando."
      else
        kind create cluster --name "${var.cluster_name}" --config "${local.kind_config_path}"
      fi
    EOT
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["bash", "-c"]
    command     = "kind delete cluster --name \"${self.triggers.cluster_name}\" || true"
  }
}

resource "null_resource" "metrics_server" {
  depends_on = [null_resource.kind_cluster]

  triggers = {
    cluster_name  = var.cluster_name
    manifest_hash = filesha256(local.metrics_server_manifest)
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -e
      kubectl --context "${local.kube_context}" apply -f "${local.metrics_server_manifest}"
      kubectl --context "${local.kube_context}" -n kube-system rollout status deployment/metrics-server --timeout=120s
    EOT
  }
}

resource "null_resource" "database" {
  depends_on = [null_resource.kind_cluster]

  triggers = {
    cluster_name  = var.cluster_name
    namespace     = filesha256("${var.k8s_dir}/namespace.yaml")
    configmap     = filesha256("${var.k8s_dir}/configmap.yaml")
    secret        = filesha256("${var.k8s_dir}/secret.yaml")
    pg_deployment = filesha256("${var.k8s_dir}/postgres/deployment.yaml")
    pg_service    = filesha256("${var.k8s_dir}/postgres/service.yaml")
    pg_pvc        = filesha256("${var.k8s_dir}/postgres/pvc.yaml")
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -e
      kubectl --context "${local.kube_context}" apply -f "${var.k8s_dir}/namespace.yaml"
      kubectl --context "${local.kube_context}" apply -f "${var.k8s_dir}/configmap.yaml"
      kubectl --context "${local.kube_context}" apply -f "${var.k8s_dir}/secret.yaml"
      kubectl --context "${local.kube_context}" apply -f "${var.k8s_dir}/postgres/"
      kubectl --context "${local.kube_context}" -n castor-garage rollout status deployment/postgres --timeout=120s
    EOT
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["bash", "-c"]
    command     = "kubectl --context \"kind-${self.triggers.cluster_name}\" delete namespace castor-garage --ignore-not-found --wait=true || true"
  }
}
