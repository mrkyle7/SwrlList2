#!/usr/bin/env bash
# Google sign-in is refused on any host that is not on the Firebase Auth
# authorised-domains list. Run once after the first deploy (needs an
# authenticated gcloud; safe to re-run):
#
#   scripts/firebase-auth-domains.sh
#
# This is not in terraform on purpose: the only resource for it manages the
# project's whole Firebase Auth configuration, which was set up by hand.
set -euo pipefail

PROJECT="${PROJECT:-swrl-1118}"
REGION="${REGION:-us-east1}"
SERVICE="${SERVICE:-swrl-list}"
DOMAIN="${DOMAIN:-swrl-list.com}"

url="$(gcloud --project "$PROJECT" run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)')"
token="$(gcloud auth print-access-token)"
api="https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config"
config="$(curl -fsS -H "Authorization: Bearer $token" -H "x-goog-user-project: $PROJECT" "$api")"
body="$(printf '%s' "$config" | python3 -c '
import json, sys
domains = json.load(sys.stdin).get("authorizedDomains", [])
for d in sys.argv[1:]:
    if d not in domains:
        domains.append(d)
print(json.dumps({"authorizedDomains": domains}))' "$DOMAIN" "www.$DOMAIN" "${url#https://}")"
curl -fsS -X PATCH -H "Authorization: Bearer $token" -H "x-goog-user-project: $PROJECT" \
  -H 'Content-Type: application/json' -d "$body" "$api?updateMask=authorizedDomains" >/dev/null
echo "Firebase Auth authorised domains: $body"
