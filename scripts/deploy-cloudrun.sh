#!/usr/bin/env bash
# Deploy the Swrl List browser app to Cloud Run and put it on its own domain.
#
#   scripts/deploy-cloudrun.sh deploy        build with Cloud Build + deploy
#   scripts/deploy-cloudrun.sh auth-domains  allow the site's hosts in Firebase Auth
#   scripts/deploy-cloudrun.sh domain        Cloud DNS zone + HTTPS domain mapping
#   scripts/deploy-cloudrun.sh status        show service URL, mapping and cert state
#
# Needs an authenticated gcloud (Cloud Shell works out of the box). Every step
# is safe to re-run.
set -euo pipefail

PROJECT="${PROJECT:-swrl-1118}"
# europe-west1 rather than europe-west2: Cloud Run domain mappings are not
# offered in London.
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-swrl-list}"
DOMAIN="${DOMAIN:-swrl-list.com}"
ZONE="${ZONE:-swrl-list-com}"
BGG_SECRET="${BGG_SECRET:-bgg-api-token}"

cd "$(dirname "$0")/.."
gc() { gcloud --project "$PROJECT" "$@"; }

service_url() {
  gc run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)'
}

deploy() {
  gc services enable run.googleapis.com cloudbuild.googleapis.com \
    artifactregistry.googleapis.com secretmanager.googleapis.com

  local secret_flags=()
  if gc secrets describe "$BGG_SECRET" >/dev/null 2>&1; then
    local number
    number="$(gc projects describe "$PROJECT" --format 'value(projectNumber)')"
    gc secrets add-iam-policy-binding "$BGG_SECRET" \
      --member "serviceAccount:${number}-compute@developer.gserviceaccount.com" \
      --role roles/secretmanager.secretAccessor >/dev/null
    secret_flags=(--set-secrets "BGG_API_TOKEN=${BGG_SECRET}:latest")
  else
    echo "!! Secret '$BGG_SECRET' not found - board game / video game search will be"
    echo "!! unavailable until it exists. Create it, then re-run this step:"
    echo "!!   printf '%s' '<token>' | gcloud --project $PROJECT secrets create $BGG_SECRET --data-file=-"
  fi

  # --source builds the repo's Dockerfile with Cloud Build and stores the image
  # in the cloud-run-source-deploy Artifact Registry repository.
  gc run deploy "$SERVICE" --source . --region "$REGION" \
    --allow-unauthenticated --port 8080 \
    --memory 256Mi --cpu 1 --min-instances 0 --max-instances 3 \
    "${secret_flags[@]}"

  local url
  url="$(service_url)"
  echo "Deployed: $url"
  curl -fsS "$url/api/v1/health" && echo
}

# Google sign-in is refused on any host that is not on the Firebase Auth
# authorised-domains list.
auth_domains() {
  local url host token api config
  url="$(service_url)"
  host="${url#https://}"
  token="$(gcloud auth print-access-token)"
  api="https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config"
  config="$(curl -fsS -H "Authorization: Bearer $token" -H "x-goog-user-project: $PROJECT" "$api")"
  local body
  body="$(printf '%s' "$config" | python3 -c '
import json, sys
domains = json.load(sys.stdin).get("authorizedDomains", [])
for d in sys.argv[1:]:
    if d not in domains:
        domains.append(d)
print(json.dumps({"authorizedDomains": domains}))' "$DOMAIN" "www.$DOMAIN" "$host")"
  curl -fsS -X PATCH -H "Authorization: Bearer $token" -H "x-goog-user-project: $PROJECT" \
    -H 'Content-Type: application/json' -d "$body" "$api?updateMask=authorizedDomains" >/dev/null
  echo "Firebase Auth authorised domains: $body"
}

domain() {
  gc services enable dns.googleapis.com

  if ! gc dns managed-zones describe "$ZONE" >/dev/null 2>&1; then
    gc dns managed-zones create "$ZONE" --dns-name "${DOMAIN}." \
      --description "Swrl List" --visibility public
  fi
  echo "Cloud DNS name servers for $DOMAIN (set these at the registrar):"
  gc dns managed-zones describe "$ZONE" --format 'value(nameServers)' | tr ';' '\n' | sed 's/^/  /'

  # Fails with a clear message if this account has not verified the domain
  # (domains registered through Cloud Domains by this account are verified
  # automatically; otherwise run: gcloud domains verify $DOMAIN).
  for name in "$DOMAIN" "www.$DOMAIN"; do
    if ! gc beta run domain-mappings describe --domain "$name" --region "$REGION" >/dev/null 2>&1; then
      gc beta run domain-mappings create --service "$SERVICE" --domain "$name" --region "$REGION"
    fi
  done

  # Copy the records Cloud Run asks for into the zone.
  for name in "$DOMAIN" "www.$DOMAIN"; do
    gc beta run domain-mappings describe --domain "$name" --region "$REGION" \
      --format 'csv[no-heading](status.resourceRecords[].type,status.resourceRecords[].rrdata)' \
      | python3 -c '
import collections, sys
records = collections.defaultdict(list)
for line in sys.stdin:
    types, _, datas = line.strip().partition(",")
    for t, d in zip(types.split(";"), datas.split(";")):
        if t and d:
            records[t].append(d)
for t, ds in records.items():
    print(t, ",".join(ds))' \
      | while read -r type rrdatas; do
          if gc dns record-sets describe "${name}." --zone "$ZONE" --type "$type" >/dev/null 2>&1; then
            gc dns record-sets update "${name}." --zone "$ZONE" --type "$type" --ttl 300 --rrdatas "$rrdatas"
          else
            gc dns record-sets create "${name}." --zone "$ZONE" --type "$type" --ttl 300 --rrdatas "$rrdatas"
          fi
        done
  done
  echo "DNS records are in place. Google issues the HTTPS certificate once the"
  echo "registrar's name servers point at Cloud DNS (usually 15 min - a few hours)."
  echo "Check progress with: $0 status"
}

status() {
  echo "Service: $(service_url)"
  for name in "$DOMAIN" "www.$DOMAIN"; do
    echo "--- $name"
    gc beta run domain-mappings describe --domain "$name" --region "$REGION" \
      --format 'table[no-heading](status.conditions[].type,status.conditions[].status,status.conditions[].message)' \
      2>/dev/null || echo "no domain mapping yet"
  done
}

case "${1:-}" in
  deploy) deploy ;;
  auth-domains) auth_domains ;;
  domain) domain ;;
  status) status ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac
