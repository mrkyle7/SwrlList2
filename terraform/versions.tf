terraform {
  required_version = ">= 1.14.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.30"
    }
  }

  # State lives in GCS so GitHub Actions and people share one copy. The bucket
  # is created once by terraform/bootstrap.sh.
  backend "gcs" {
    bucket = "swrl-1118-tfstate"
    prefix = "swrllist2"
  }
}
