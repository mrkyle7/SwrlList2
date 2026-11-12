output "cloud_run_url" {
  value       = google_cloud_run_v2_service.this.uri
  description = "Direct Cloud Run URL for the app"
}

output "name_servers" {
  value       = google_dns_managed_zone.this.name_servers
  description = "Set these as the name servers for the domain at its registrar"
}

output "image_repository" {
  value       = "${var.region}-docker.pkg.dev/${var.project}/${google_artifact_registry_repository.images.repository_id}"
  description = "Where the workflow pushes images"
}

output "secrets" {
  value       = merge(local.secret_ids, { for name in var.function_secrets : name => name })
  description = "GitHub Actions secret name -> Secret Manager secret it is copied into"
}
