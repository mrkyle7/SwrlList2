# APIs this setup depends on. GitHub Actions call them as service accounts,
# which bill quota to this project, so they must be enabled here.
#
# cloudresourcemanager, serviceusage and the IAM ones are switched on by
# terraform/bootstrap.sh before the first apply: terraform needs them to read
# anything, including this resource.
resource "google_project_service" "required" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com", # project IAM policy
    "serviceusage.googleapis.com",         # reading and enabling APIs
    "iam.googleapis.com",                  # service accounts and the GitHub pool
    "iamcredentials.googleapis.com",       # GitHub Actions acting as service accounts
    "sts.googleapis.com",                  # exchanging GitHub's token
    "artifactregistry.googleapis.com",     # image registry
    "run.googleapis.com",                  # the service
    "secretmanager.googleapis.com",        # BGG_API_TOKEN
    "dns.googleapis.com",                  # the swrl-list-com zone
    "storage.googleapis.com",              # state bucket
    "cloudfunctions.googleapis.com",       # functions/
    "cloudbuild.googleapis.com",           # builds the functions on deploy
    "firebase.googleapis.com",             # firebase-tools reads the project
  ])
  project            = var.project
  service            = each.value
  disable_on_destroy = false
}
