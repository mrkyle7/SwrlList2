# ---------------------------------------------------------------------------
# The Swrl List web app: a public Cloud Run service built from this repo's
# Dockerfile and deployed by .github/workflows/deploy.yml.
# ---------------------------------------------------------------------------

locals {
  # BGG_API_TOKEN -> swrl-list-bgg-api-token
  secret_ids = { for env in var.secrets : env => "${var.service_name}-${lower(replace(env, "_", "-"))}" }
}

resource "google_service_account" "run" {
  project      = var.project
  account_id   = "${var.service_name}-run"
  display_name = "Cloud Run service account for ${var.service_name}"
}

resource "google_artifact_registry_repository" "images" {
  project       = var.project
  location      = var.region
  repository_id = var.service_name
  description   = "Docker images for ${var.service_name}"
  format        = "DOCKER"

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }

  cleanup_policies {
    id     = "delete-old-tagged"
    action = "DELETE"
    condition {
      tag_state  = "TAGGED"
      older_than = "2592000s" # 30 days
    }
  }

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_artifact_registry_repository_iam_member" "run_pulls_images" {
  project    = var.project
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.run.email}"
}

resource "google_cloud_run_v2_service" "this" {
  project             = var.project
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      # Placeholder until the workflow deploys the real image. Later image
      # changes come from those deploys, so terraform ignores them.
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
        # Only billed while handling a request.
        cpu_idle = true
      }

      dynamic "env" {
        for_each = local.secret_ids
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.this[env.key].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.required,
    google_artifact_registry_repository_iam_member.run_pulls_images,
    google_secret_manager_secret_version.placeholder,
    google_secret_manager_secret_iam_member.run_reads,
  ]
}

resource "google_cloud_run_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.this.project
  location = google_cloud_run_v2_service.this.location
  service  = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- Secrets ------------------------------------------------------------------
#
# The deploy workflow fills these in from GitHub Actions secrets of the same
# name on each deploy, so no secret value is ever in the terraform or its
# state. Until then each holds a "not-set" placeholder: Cloud Run can't start a
# revision whose secret has no versions, and server.js treats the placeholder
# as not configured. The placeholder is write-only, so terraform never reads it
# back and the read-only plan account can still plan.

resource "google_secret_manager_secret" "this" {
  for_each  = local.secret_ids
  project   = var.project
  secret_id = each.value
  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "placeholder" {
  for_each               = local.secret_ids
  secret                 = google_secret_manager_secret.this[each.key].id
  secret_data_wo         = "not-set"
  secret_data_wo_version = 1
}

resource "google_secret_manager_secret_iam_member" "run_reads" {
  for_each  = local.secret_ids
  project   = var.project
  secret_id = google_secret_manager_secret.this[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run.email}"
}
