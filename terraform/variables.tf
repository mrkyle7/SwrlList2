variable "project" {
  type        = string
  default     = "swrl-1118"
  description = "GCP project. The same one Firebase uses."
}

variable "region" {
  type        = string
  default     = "us-east1"
  description = "GCP region. Same as cheetahmoongames: a tier 1 (cheapest) Cloud Run region that supports domain mappings."
}

variable "service_name" {
  type        = string
  default     = "swrl-list"
  description = "Cloud Run service, image registry and image name."
}

variable "domain_name" {
  type        = string
  default     = "swrl-list.com"
  description = "Apex domain the app is served on. www.<domain_name> is mapped too."
}

variable "dns_zone" {
  type        = string
  default     = "swrl-list-com"
  description = "Cloud DNS managed zone for domain_name."
}

variable "map_domain" {
  type        = bool
  default     = false
  description = <<-EOT
    Map domain_name (and www) onto the service. Leave false until the domain is
    registered, its name servers point at the Cloud DNS zone, and
    github-terraform is a verified owner of it (see terraform/README.md):
    Cloud Run refuses the mapping otherwise and the whole apply fails.
  EOT
}

variable "secrets" {
  type        = list(string)
  default     = ["BGG_API_TOKEN"]
  description = <<-EOT
    Secret environment variables for the container. Each becomes a Secret
    Manager secret (BGG_API_TOKEN -> swrl-list-bgg-api-token) that the deploy
    workflow fills from the GitHub Actions secret of the same name. Keep in
    step with the "Sync secrets" step in .github/workflows/deploy.yml.
  EOT
}

variable "github_repo" {
  type        = string
  default     = "mrkyle7/SwrlList2"
  description = "The only repo whose GitHub Actions may authenticate to this project."
}

variable "deploy_branches" {
  type        = list(string)
  default     = ["master"]
  description = "Branches of github_repo whose workflows may act as terraform_service_account. Everything else, pull requests included, only gets the read-only plan account."
}

variable "terraform_service_account" {
  type        = string
  default     = "github-terraform@swrl-1118.iam.gserviceaccount.com"
  description = "Service account the workflow applies the terraform and deploys as. Created by terraform/bootstrap.sh."
}

variable "state_bucket" {
  type        = string
  default     = "swrl-1118-tfstate"
  description = "Terraform state bucket. Must match the backend block in versions.tf."
}
