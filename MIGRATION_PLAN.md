# Heroku → Cloud Run migration & modernisation — status

The migration is done. This file records what was decided and what is left;
the how-to lives in `Readme.md`, `terraform/README.md` and `.claude/skills/`.

## Done

| Phase | Outcome |
| --- | --- |
| 1. Off Heroku | Docker image on Cloud Run (`swrl-1118`, `us-east1`, service `swrl-list`), deployed and live. |
| 2. Node + build tooling | Node 24, webpack 5, no Babel. `npm run build` → `dist/`. All dependencies on their current major versions. |
| 3. Firebase SDK | Current SDK through `firebase/compat/*` (namespaced API kept). |
| 4. Mobile shell | **Dropped** (user decision): Cordova, the Android/iOS builds and Fastlane are removed. The app is a PWA only. |
| 5. Cloud Functions | Node 22, current `firebase-functions` (1st gen API) and modular `firebase-admin`; `sendEachForMulticast` replaces the shut-down `sendToDevice`; Pushover keys are Secret Manager secrets. Deployed from CI. |
| 6. Tests + type-check | Cypress replaced by Vitest (it was only running model unit tests). Type-check passes with zero errors and gates CI. |
| 7. CI/CD | GitHub Actions + terraform (not Cloud Build), modelled on mrkyle7/cheetahmoongames. |
| 8. Cleanup | Heroku, Cordova, Fastlane, Cypress and their files are gone. |

Also done along the way: PWA (manifest, service worker, offline shell);
`swrl-list.com`; TMDB / OMDb / BoardGameGeek keys moved server-side; Open
Library and BoardGameGeek integrations repaired; Google sign-in switched from
redirect to popup.

## Not verified

These could not be exercised from the agent environment (no Google login, and
tests must not touch the live Firebase project). Check them on the live site:

- Google sign-in (popup) and Firestore reads/writes on the current Firebase SDK.
- Push notifications end to end (browser token → `recommendationNotification`).
- The first `deploy-functions` run. In particular: it replaces the old Node 8
  functions in place, and the deploy account's roles for `firebase-tools`
  (`terraform/github.tf`) are a best estimate.
- The BoardGameGeek proxy with a real token.

## Left to do / worth knowing

- **Rotate the TMDB and OMDb keys**: the old ones are in git history.
- **Saved board/video games** opened while BoardGameGeek was failing may have
  had their details overwritten with "Unknown" in Firestore (old getter bug,
  fixed). Re-opening one with a working token repairs it.
- **Modular Firebase API**: the compat layer is supported but is the legacy
  surface. Moving `src/` to the modular API would shrink the bundle; it is a
  refactor of every Firestore call site.
- **Firebase Dynamic Links** (`swrl1118.page.link`) was shut down by Google in
  2025; nothing in the web app uses it any more.
- **Play Store listing**: the Android app can no longer be built from this
  repo. Unpublish it, or wrap the PWA (Trusted Web Activity) later.
- No browser end-to-end tests are in the repo (see `swrl-testing` skill).
