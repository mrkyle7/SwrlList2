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
npm run test:rules        # firestore.rules against the Firestore emulator (needs Java)
```

Emulators: `firebase.emulators.json` (Auth, Firestore with `firestore.rules`,
Functions) is started with `npx --yes firebase-tools@15 emulators:start --config
firebase.emulators.json --only auth,firestore,functions --project swrl-1118`;
see the `swrl-firebase` skill.

`server.js` serves `dist/`, returns `index.html` for the client-side routes
(`/swrl/:id`, `/swrler/:id`, `/recommend/:id`, `/watch`, `/read`, `/listen`,
`/play`, `/eat`, `/recommendations`, `/savedsearches`, `/friends`, `/settings`,
`/search`, `/share`, `/about`; the
`appRoutes` list in `server.js`, mirrored in `www/sw.js` and `src/index.js`) and proxies the third-party
APIs that need a key (`/api/v1/tmdb/*`, `/api/v1/omdb`, `/api/v1/geek/*`), plus
keyless ones that are better from the server: iTunes, Spotify oEmbed,
`/api/v1/eat/search` and `/api/v1/eat/place` (the **Google Places API (New)**,
`serverlib/places.js`: Text Search with Pro fields only, and one details call
plus one photo when a place's page opens; called with the Cloud Run service
account's token from the metadata server, or `GOOGLE_PLACES_API_KEY` when set,
e.g. locally; `DAILY_CAPS` per instance keep two instances inside the free
monthly allowances; answers cached 6 hours; "near" rounded to about a
kilometre; search words and location kept out of the logs; failures answer
with Google's reason). Terraform enables `places.googleapis.com` and gives
the runtime account `roles/serviceusage.serviceUsageConsumer`. The Dockerfile
copies `serverlib/` next to `server.js`. Locally there is no metadata server:
stub `/api/v1/eat/*` in Playwright.
(`/api/v1/geek/*` is paused, answering 503 at once, while `BGG_PAUSED` is
true in `server.js`: we are waiting for BGG to issue the key.)
Searches need `TMDB_API_KEY`, `OMDB_API_KEY` and `BGG_API_TOKEN` in the
environment.

`www/index.html` has `<base href="/">`: every asset URL in the page and in
`src/` is relative (`img/...`) and resolves from the root on deep links. Keep
it.

## Build pieces

- `webpack.config.js` - two builds: the app (`bundle.<contenthash>.js`) and the push
  service worker (`firebase-messaging-sw.js`, loaded into `sw.js` with `importScripts`). Its `hashedShell` plugin renames
  `www/css/index.css` to `css/index.<hash>.css`, points `index.html` at both
  hashed files, and writes this build's id and files into `sw.js` (the
  `'__BUILD__'` and `'__SHELL_FILES__'` placeholders). The build fails if
  `index.html` stops naming `bundle.js` / `css/index.css` or the placeholders
  go missing; keep those names in `www/`. No Babel; the source is plain
  modern JS. CSS via
  `style-loader`/`css-loader`, fonts (`@fontsource/raleway`) emitted to
  `dist/fonts/`, `www/` copied as-is.
- `Dockerfile` - stage 1 `npm ci && npm run build`; stage 2 is
  `node:24-slim` with only the runtime dependency (`express`) and `dist/`.
  Everything else in `package.json` is a devDependency because it is bundled.
- `www/sw.js` - app-shell service worker: **one cache per build, and the app
  opens from it** (`swrl-shell-<build>`). Installing downloads the page and the
  hashed bundle and stylesheet (it fails without them, so a broken deploy
  leaves the old build working); app routes are answered from that cache,
  hashed files cache-first, images and the manifest from the cache and
  refreshed in the background. `/api/`, `/__/`, `/version.json` and the workers
  always go to the network. A new deploy changes `sw.js`, so the browser
  installs the new worker, which takes over and deletes the old cache.
- `server.js` compresses everything with `compression` (the bundle is about
  270 KB on the wire instead of 920 KB) and serves `*.<8 hex>.js|css` with
  `Cache-Control: public, max-age=31536000, immutable`.

## Deploy

Merging to `master` deploys everything: `.github/workflows/deploy.yml`
applies `terraform/`, builds and pushes the image, copies GitHub secrets into
Secret Manager, deploys to Cloud Run (verifying, and rolling back on
failure), then deploys `functions/` with `firebase-tools`
(`firebase deploy --only functions`, every export of `functions/index.js`).
Pull requests get the tests, an image smoke test and a terraform plan. See
`terraform/README.md`.

**Not deployed by CI:** `firestore.rules` and `firestore.indexes.json` (applied
by hand in the Firebase console), and `scripts/migrate-list-entries.js` (run by
the owner). `npm run test:rules` is not run by CI either. The owner's checklist
is in `docs/friends-and-visibility-plan.md` ("Rollout").

Project `swrl-1118`, region `us-east1`, service `swrl-list`.

## New builds reach open apps

- `webpack.config.js` writes `dist/version.json` (`{"version": APP_VERSION}`),
  the same string the bundle shows in the menu. `server.js` serves it, the
  pages and the service workers with `no-cache`; `www/sw.js`
  never answers `/version.json` from its cache.
- `src/components/updateCheck.js` asks for it 10 s after start, whenever the
  app comes back into view, and every 15 minutes while open, and never pulls
  the screen out from under anyone (`updateAction` in `src/model/update.js`):
  - an ordinary new build: it asks the service worker to fetch it
    (`registration.update()`) and does nothing visible; the app opens the new
    build the next time it starts;
  - a build after a release marked with `updateNotice` in `package.json`
    (`{"version": "x.y.z", "text": "What changed, in a few words"}`, copied into
    `version.json`) when this app is older than that release: a toast with the
    text and an **Update** button (15 s, asked again at most every 10 minutes).
    Only that tap reloads, once nothing is typed or open, onto the same screen
    (the address is kept), after waiting for the new worker; never twice in a
    tab for the same version (`sessionStorage`).
- Mark a release with `updateNotice` only when someone mid-session would be
  confused by the change (a new look, moved navigation). Leave it in place in
  later releases until a newer notice replaces it, so an app that skipped
  versions is still asked.
- Testing it: build, open the app, then `GIT_SHA=<anything> npm run build`
  (a new version string and new hashes) while it is open; within about 10 s
  the new worker installs (one `swrl-shell-*` cache left) with no reload, and
  reopening the app opens the new bundle.
- Testing it: Playwright's `page.route('**/version.json', ...)` works because
  the service worker leaves that path alone.

## Opening instantly (offline first)

On start the app assumes it is offline and shows what it has, then catches up:

- **The app itself:** the service worker serves the shell from this build's
  cache (`www/sw.js`); a cold start never waits on the network.
- **Who I am, my settings and my list:** `src/firebase/bootCache.js` keeps a
  copy in its own IndexedDB database (`swrl-boot`, shape in
  `src/model/bootData.js`, saved a moment after each change, deleted on
  logout). `login.js` opens from it before Firebase answers; the list listener
  is primed from it (`primeListEntries`) and its first live snapshot replaces
  it outright. Firebase alone cannot do this: Auth checks the saved sign-in
  with the server (`getAccountInfo`) before saying who is signed in, and
  Firestore, its cache included, waits for Auth.
- **Other reads:** `src/firebase/cacheFirst.js` (`getDocFast`, `getDocsFast`):
  the local copy at once, the server's in the background. Use them on any
  screen or start-up path; plain `getDoc` waits on the server first.
- **Live changes** from elsewhere redraw Your list in place (same scroll, no
  "Loading"), and only when what it shows changed; my own taps never redraw it.
- Measured (Playwright, 30 entries, 3 s latency / 20 kB/s): first card 12 s
  before, 0.26 s after; offline 0.38 s before, 0.23 s after.

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

- The CI smoke test finds the bundle's name in `/watch` and checks it is
  served gzipped; it no longer fetches `/bundle.js`, which does not exist.
- The `Build and smoke-test the image` job name is a required status check
  on `master`; renaming it blocks every pull request.
- Express is v5: wildcard routes are named (`/api/v1/tmdb/*parts`) and
  `req.params.parts` is an array.
