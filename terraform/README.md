# Infrastructure

Everything the web app runs on, in the `swrl-1118` project (the Firebase one),
region `us-east1`. Modelled on
[mrkyle7/cheetahmoongames](https://github.com/mrkyle7/cheetahmoongames).

| File | What |
| --- | --- |
| `app.tf` | Cloud Run service `swrl-list`, its runtime account, image registry and secrets |
| `domain.tf` | Cloud DNS zone for `swrl-list.com`; domain mappings + HTTPS once `map_domain` is true |
| `github.tf` | Keyless sign-in from GitHub Actions (Workload Identity Federation) |
| `apis.tf` | Google APIs that must be on |
| `bootstrap.sh` | The one-time setup terraform can't do for itself |

## How changes ship

`.github/workflows/deploy.yml`:

- **Pull request:** builds the image and smoke-tests it, validates the
  terraform and posts the plan (as a read-only account).
- **Merge to `master`:** applies the terraform, builds and pushes the image,
  copies GitHub secrets into Secret Manager, deploys, verifies, and rolls back
  if the new revision fails.

The workflow won't apply a plan that **deletes or replaces** anything. To go
ahead, run it by hand (Actions → Deploy → Run workflow) with **allow_destroy**
ticked.

## GitHub secrets

No Google credentials are stored in GitHub: the workflow signs in with OIDC.

| GitHub Actions secret | Copied into Secret Manager as | Used for |
| --- | --- | --- |
| `TMDB_API_KEY` | `swrl-list-tmdb-api-key` | The Movie Database "API Key (v3 auth)", from https://www.themoviedb.org/settings/api. Film and TV search and details. |
| `OMDB_API_KEY` | `swrl-list-omdb-api-key` | OMDb key, from https://www.omdbapi.com/apikey.aspx. Adds IMDb / Rotten Tomatoes / Metacritic ratings and the plot to films; films still work without it. |
| `BGG_API_TOKEN` | `swrl-list-bgg-api-token` | BoardGameGeek application token, from https://boardgamegeek.com/applications. Board game and video game search and details. |

Each is optional in the sense that the deploy succeeds without it: that
category's search just returns an error until it is set. All three are only
ever used by `server.js` (`/api/v1/tmdb`, `/api/v1/omdb`, `/api/v1/geek`); the
client bundle contains no keys.

The TMDB and OMDb keys that used to be hardcoded in `src/` are still in git
history, so treat them as public: rotate them and set the new ones here.

Terraform creates each secret with a `not-set` placeholder and wires it into
the service; the deploy job fills in the real value, so no secret value is in
the terraform or its state. To add another: append its name to `secrets` in
`variables.tf` and add a `sync` line (and `env:` entry) to the "Sync secrets"
step in the workflow.

## One-time setup

1. As a project owner (Cloud Shell is easiest), from a checkout of this repo:

   ```sh
   terraform/bootstrap.sh
   ```

   It enables the APIs terraform needs to start, and creates the state bucket
   `gs://swrl-1118-tfstate`, the `github-terraform` and
   `github-terraform-plan` service accounts and the GitHub sign-in pool.
   `github.tf` adopts them with `import` blocks. Safe to re-run.
2. Add the secrets above in GitHub (Settings → Secrets and variables →
   Actions).
3. Merge to `master`. The first run creates everything and deploys; the app is
   then live on the `cloud_run_url` output (shown at the end of the apply log).
4. Run `scripts/firebase-auth-domains.sh` once so Google sign-in works on the
   new hosts.

### The domain

`swrl-list.com` was not registered when this was written, so `map_domain`
defaults to `false`. To switch it on:

1. Register the domain and set its name servers to the `name_servers` output
   (the zone already exists after the first apply).
2. Make `github-terraform@swrl-1118.iam.gserviceaccount.com` a verified owner
   of the domain. Cloud Run only lets a verified owner map a domain, and
   ownership lives in Google's Site Verification service, not IAM, so terraform
   can't grant it. In [Search Console](https://search.google.com/search-console):
   add a **Domain** property for `swrl-list.com`, verify it with the TXT record
   it gives you (add that to the Cloud DNS zone), then Settings → Users and
   permissions → ⋮ → Manage property owners → **Add an owner**. Without this the
   apply fails with "Caller is not authorized to administer the domain".
3. Set `map_domain`'s default to `true` in `variables.tf` and merge. Google
   issues the certificates once DNS resolves (usually 15 minutes to a few
   hours).

## Working with the terraform locally

```sh
gcloud auth application-default login
cd terraform
terraform init
terraform plan
```

Prefer letting CI apply. If you do apply by hand, commit the same change
straight after, or the next CI run will undo it.
