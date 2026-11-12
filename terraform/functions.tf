# ---------------------------------------------------------------------------
# Cloud Functions (functions/ in this repo). The functions themselves are
# deployed by the workflow with firebase-tools; terraform only owns the
# secrets they read, the same way as for the web app (see app.tf).
# ---------------------------------------------------------------------------

resource "google_secret_manager_secret" "function" {
  for_each  = toset(var.function_secrets)
  project   = var.project
  secret_id = each.value
  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "function_placeholder" {
  for_each               = toset(var.function_secrets)
  secret                 = google_secret_manager_secret.function[each.key].id
  secret_data_wo         = "not-set"
  secret_data_wo_version = 1
}
