# ---------------------------------------------------------------------------
# GitHub Actions -> GCP via Workload Identity Federation (OIDC, no keys).
#
# The provider only accepts tokens from var.github_repo, and a token alone
# grants nothing. A workflow can only act as the account bound to it below:
#
#   master                 github-terraform       applies this terraform and
#                                                 deploys the app (admin)
#   any branch / pull      github-terraform-plan  read-only plan
#   request
# ---------------------------------------------------------------------------

# The pool, provider and both service accounts are created by
# terraform/bootstrap.sh so that the very first plan and apply can already run
# from GitHub Actions. These blocks adopt them into the state (github-terraform
# itself stays outside terraform; only its roles are managed here).
import {
  to = google_iam_workload_identity_pool.github
  id = "projects/${var.project}/locations/global/workloadIdentityPools/github-pool"
}

import {
  to = google_iam_workload_identity_pool_provider.github
  id = "projects/${var.project}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
}

import {
  to = google_service_account.terraform_plan
  id = "projects/${var.project}/serviceAccounts/github-terraform-plan@${var.project}.iam.gserviceaccount.com"
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions OIDC Provider"
  # Values come from GitHub's signed OIDC token, so a workflow can't fake them.
  # repository_ref ("owner/repo@refs/heads/master") lets a binding require a
  # branch: pull requests run as refs/pull/N/merge and other branches as their
  # own ref, so neither matches.
  attribute_mapping = {
    "google.subject"           = "assertion.sub"
    "attribute.repository"     = "assertion.repository"
    "attribute.repository_ref" = "assertion.repository + '@' + assertion.ref"
  }
  # pull_request_target runs with the default branch's ref, which would satisfy
  # a branch check, so it can never sign in. This repo doesn't use it.
  attribute_condition = "attribute.repository == '${var.github_repo}' && assertion.event_name != 'pull_request_target'"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# --- Apply and deploy: deploy branches only -----------------------------------
#
# github-terraform can change anything, so only workflows running on a deploy
# branch may act as it: merges, and manual runs started on that branch. A pull
# request that edits the workflow still runs as refs/pull/N/merge and is
# refused by GCP itself.

resource "google_service_account_iam_member" "github_terraform" {
  for_each           = toset(var.deploy_branches)
  service_account_id = "projects/${var.project}/serviceAccounts/${var.terraform_service_account}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository_ref/${var.github_repo}@refs/heads/${each.value}"
}

# Everything this terraform manages, plus building and deploying the app
# (Cloud Run and Artifact Registry admin cover that). Keep in step with
# ROLES in bootstrap.sh.
locals {
  terraform_roles = [
    "roles/run.admin",                       # the service, its IAM and domain mappings
    "roles/iam.serviceAccountAdmin",         # runtime and plan accounts, and their IAM
    "roles/iam.serviceAccountUser",          # create revisions that run as the runtime account
    "roles/iam.workloadIdentityPoolAdmin",   # the GitHub pool and provider
    "roles/resourcemanager.projectIamAdmin", # project-level bindings like these
    "roles/secretmanager.admin",             # secrets, their versions and IAM
    "roles/artifactregistry.admin",          # image registry and its IAM
    "roles/dns.admin",                       # the swrl-list-com zone
    "roles/serviceusage.serviceUsageAdmin",  # enabling APIs
    "roles/storage.admin",                   # terraform state
  ]
}

resource "google_project_iam_member" "terraform" {
  for_each = toset(local.terraform_roles)
  project  = var.project
  role     = each.value
  member   = "serviceAccount:${var.terraform_service_account}"
}

# --- Plans on pull requests: read-only -----------------------------------------
#
# Any branch or pull request in this repo may act as this account, so it must
# never be able to change anything. It can read the project's configuration and
# IAM (not secret values) and the Terraform state. Plans run with -lock=false
# because taking the state lock needs write access.

resource "google_service_account" "terraform_plan" {
  project      = var.project
  account_id   = "github-terraform-plan"
  display_name = "Read-only Terraform plans for ${var.github_repo} pull requests"
}

resource "google_service_account_iam_member" "github_terraform_plan" {
  service_account_id = google_service_account.terraform_plan.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

resource "google_project_iam_member" "terraform_plan" {
  for_each = toset([
    "roles/viewer",                         # resources and their settings
    "roles/iam.securityReviewer",           # IAM policies on every resource
    "roles/iam.workloadIdentityPoolViewer", # the GitHub pool and provider
  ])
  project = var.project
  role    = each.value
  member  = "serviceAccount:${google_service_account.terraform_plan.email}"
}

# The state bucket is created by bootstrap.sh, so only its IAM is here.
resource "google_storage_bucket_iam_member" "terraform_plan_reads_state" {
  bucket = var.state_bucket
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.terraform_plan.email}"
}
