---
name: swrl-build-deploy
description: Use when building, running or deploying the app - webpack, the Express server, the Docker image, the GitHub Actions deploy to Cloud Run, or the Cloud Functions deploy.
---

# Build, run and deploy

The app is a web app only (an installable PWA). There is no native build.

## Local

```bash
npm ci
npm run build      # webpack: www/ + src/ -> dist/
npm start          # node server.js on http://localhost:8080 (or PORT)
npm run dev        # webpack in watch mode; run `npm start` alongside
npm run build:emulators   # same build, pointed at local Firebase emulators
```

`server.js` serves `dist/`, returns `index.html` for the client-side routes
(`/swrl/:id`, `/swrler/:id`, `/recommend/:id`, `/watch`, `/read`, `/listen`,
`/play`, `/recommendations`, `/savedsearches`) and proxies the third-party
APIs that need a key (`/api/v1/tmdb/*`, `/api/v1/omdb`, `/api/v1/geek/*`).
Searches need `TMDB_API_KEY`, `OMDB_API_KEY` and `BGG_API_TOKEN` in the
environment.

`www/index.html` has `<base href="/">`: every asset URL in the page and in
`src/` is relative (`img/...`) and resolves from the root on deep links. Keep
it.

## Build pieces

- `webpack.config.js` - two builds: the app (`bundle.js`) and the push
  service worker (`firebase-messaging-sw.js`). No Babel; the source is plain
  modern JS. CSS via
  `style-loader`/`css-loader`, fonts (`@fontsource/raleway`) emitted to
  `dist/fonts/`, `www/` copied as-is.
- `Dockerfile` - stage 1 `npm ci && npm run build`; stage 2 is
  `node:24-slim` with only the runtime dependency (`express`) and `dist/`.
  Everything else in `package.json` is a devDependency because it is bundled.
- `www/sw.js` - app-shell service worker (network first). Bump `CACHE` if
  the shell file list changes.

## Deploy

Merging to `master` deploys everything: `.github/workflows/deploy.yml`
applies `terraform/`, builds and pushes the image, copies GitHub secrets into
Secret Manager, deploys to Cloud Run (verifying, and rolling back on
failure), then deploys `functions/` with `firebase-tools`. Pull requests get
the tests, an image smoke test and a terraform plan. See `terraform/README.md`.

Project `swrl-1118`, region `us-east1`, service `swrl-list`.

## Dependency updates

`.github/dependabot.yml` raises weekly pull requests: grouped minor/patch
updates for the app, `functions/`, the GitHub Actions and the terraform
providers, and separate ones for majors. They go through the same checks as
any pull request. The Node version is bumped by hand, in step, in the
`Dockerfile`, `package.json` `engines`, the workflow's `setup-node` and
`firebase.json`.

`package.json` has an `overrides` entry for `@grpc/grpc-js` (a patched
release the Firebase SDK does not yet allow). Drop it once `npm audit` is
clean without it.

## Gotchas

- The `Build and smoke-test the image` job name is a required status check
  on `master`; renaming it blocks every pull request.
- Express is v5: wildcard routes are named (`/api/v1/tmdb/*parts`) and
  `req.params.parts` is an array.
