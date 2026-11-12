#!/usr/bin/env bash
# One-time setup, run by a project owner (Cloud Shell works as-is):
#
#   terraform/bootstrap.sh
#
# It creates only what must exist before GitHub Actions can run the terraform:
# a few APIs, the state bucket, the github-terraform service account (applies,
# master only), the github-terraform-plan account (read-only plans on pull
# requests), and the Workload Identity pool that lets this repo act as them.
# Everything else - and from then on these too - is managed by terraform/*.tf,
# applied by .github/workflows/deploy.yml. Safe to re-run.
set -euo pipefail

PROJECT="${PROJECT:-swrl-1118}"
REGION="${REGION:-us-east1}"
REPO="${REPO:-mrkyle7/SwrlList2}"
BRANCH="${BRANCH:-master}"
BUCKET="${PROJECT}-tfstate"
SA="github-terraform@${PROJECT}.iam.gserviceaccount.com"
# Keep in step with local.terraform_roles in github.tf.
ROLES=(
  roles/run.admin
  roles/iam.serviceAccountAdmin
  roles/iam.serviceAccountUser
  roles/iam.workloadIdentityPoolAdmin
  roles/resourcemanager.projectIamAdmin
  roles/secretmanager.admin
  roles/artifactregistry.admin
  roles/dns.admin
  roles/serviceusage.serviceUsageAdmin
  roles/storage.admin
  roles/cloudfunctions.admin
  roles/cloudbuild.builds.editor
  roles/firebase.admin
)

gc() { gcloud --project "$PROJECT" "$@"; }

gc services enable cloudresourcemanager.googleapis.com serviceusage.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com storage.googleapis.com

if ! gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" --project "$PROJECT" \
    --location "$REGION" --uniform-bucket-level-access
fi
gcloud storage buckets update "gs://${BUCKET}" --versioning

if ! gc iam service-accounts describe "$SA" >/dev/null 2>&1; then
  gc iam service-accounts create github-terraform \
    --display-name "Terraform apply and deploys from ${REPO}"
fi
for role in "${ROLES[@]}"; do
  gc projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:${SA}" \
    --role "$role" --condition None >/dev/null
done

if ! gc iam workload-identity-pools describe github-pool --location global >/dev/null 2>&1; then
  gc iam workload-identity-pools create github-pool --location global \
    --display-name "GitHub Actions Pool"
fi
if ! gc iam workload-identity-pools providers describe github-provider \
  --location global --workload-identity-pool github-pool >/dev/null 2>&1; then
  gc iam workload-identity-pools providers create-oidc github-provider \
    --location global --workload-identity-pool github-pool \
    --display-name "GitHub Actions OIDC Provider" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_ref=assertion.repository + '@' + assertion.ref" \
    --attribute-condition "attribute.repository == '${REPO}' && assertion.event_name != 'pull_request_target'"
fi

NUMBER="$(gc projects describe "$PROJECT" --format 'value(projectNumber)')"
POOL="projects/${NUMBER}/locations/global/workloadIdentityPools/github-pool"
gc iam service-accounts add-iam-policy-binding "$SA" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/${POOL}/attribute.repository_ref/${REPO}@refs/heads/${BRANCH}" >/dev/null

# The read-only account pull requests plan as. It has to exist before the first
# pull request, which is before the first apply, so it is made here and adopted
# by github.tf like the pool.
PLAN_SA="github-terraform-plan@${PROJECT}.iam.gserviceaccount.com"
if ! gc iam service-accounts describe "$PLAN_SA" >/dev/null 2>&1; then
  gc iam service-accounts create github-terraform-plan \
    --display-name "Read-only Terraform plans for ${REPO} pull requests"
fi
for role in roles/viewer roles/iam.securityReviewer roles/iam.workloadIdentityPoolViewer; do
  gc projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:${PLAN_SA}" \
    --role "$role" --condition None >/dev/null
done
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member "serviceAccount:${PLAN_SA}" --role roles/storage.objectViewer >/dev/null
gc iam service-accounts add-iam-policy-binding "$PLAN_SA" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/${POOL}/attribute.repository/${REPO}" >/dev/null

echo
echo "Done. WIF_PROVIDER in .github/workflows/deploy.yml must be:"
echo "  ${POOL}/providers/github-provider"
echo "Now merge to ${BRANCH}; the Deploy workflow applies the terraform and ships the app."
