# Heroku → Cloud Run Migration & Modernisation Plan

**Goal:** Get the browser deploy off (the now-broken) Heroku and onto Google Cloud
Run, and bring the rest of the stack up to date in the process.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done ·
`[!]` blocked / needs decision

This plan is **resumed across sessions**. When you finish a step, tick the box
in this file and commit. When you start a session, scan for the first
unchecked box in the active phase and continue from there. Each phase ends
with a **Handoff Notes** block — fill it in before stopping so the next
session has everything it needs.

> Active branch: `claude/heroku-to-cloudrun-migration-bwAEL`
> Always commit work-in-progress to this branch.

---

## Guiding principles

1. **Get off Heroku first, modernise second.** Phase 1 produces a working
   Cloud Run deploy on the *current* (Node 11, Cordova 8) stack. Everything
   after that is improvement, not rescue.
2. **One concern per phase.** Don't bundle a Node bump with a Firebase SDK
   bump with a Cordova bump — each is a debugging session of its own.
3. **Type-check + Cypress after every phase.** `npx tsc --allowJs --noEmit`
   and `npx cypress run` are the regression net. Both must pass before
   ticking the phase complete.
4. **The Firebase web config in `src/firebase/init.js` is public.** Do not
   try to "secret" it.
5. **Don't touch `platforms/`, `www/bundle.js`, or `node_modules/`** — they
   are build artefacts.
6. **Mobile (iOS/Android) deploys are out of scope** for the Heroku → Cloud
   Run migration itself. Cordova/Capacitor work happens later, in Phase 4,
   and only if web is green.

---

## Decisions to confirm with the user before Phase 4+

These are flagged `[!]` because they change the shape of later phases.
Resolve before starting that phase.

- [!] **Cordova 12 vs Capacitor 6** for the mobile shell. Capacitor is the
      better long-term bet (active maintenance, modern plugin ecosystem) but
      it's a port, not an upgrade. Cordova 12 is a smaller leap but the
      ecosystem is mostly dead.
- [!] **GCP project name** for Cloud Run. Reuse `swrl-1118` (the Firebase
      project) or a separate one?
- [!] **Cloud Run region.** Default suggestion: `europe-west1` (Belgium) or
      `europe-west2` (London) given the existing `.firebaserc` and author
      timezone. Confirm with user.
- [!] **Domain.** `swrl-list.herokuapp.com` is hard-coded in
      `functions/index.js`, `config.xml`, and elsewhere. New domain? Custom
      domain on Cloud Run, or `*.run.app`?
- [!] **Whether Cloud Functions are still in use in production.** Per
      `CLAUDE.md`, this is unknown. If yes, Phase 5 is required; if no,
      Phase 5 can become "delete `functions/`".

---

## Phase 0 — Discovery & baseline (no code changes)

Establish what currently works, so later phases have a reference for "did I
break this?"

- [x] Tag the current commit: `git tag pre-migration-baseline`
- [x] Run `npx tsc --allowJs --noEmit` → record errors (expect some, this is
      the baseline)
- [x] Run `npx cypress run` → record passing/failing tests
- [x] Try `npm install` on a clean clone with Node 11.7.0 (via `nvm`) to
      confirm the *current* state of the lockfile builds
- [x] Try `npm start` and verify the local browser app loads at
      `http://localhost:8000`
- [x] Search the codebase for hard-coded `swrl-list.herokuapp.com` and list
      every occurrence in **Handoff Notes** below
- [ ] Confirm the GCP project to use, and that `gcloud` CLI access is set up
      (this is a user task; flag it for them)

### Phase 0 handoff notes

**Environment used for this baseline (read first):** the available sandbox
runs Node 22.22.2 + npm 10.9.7. `nvm` is not installed and the
`engines.node = 11.7.0` declaration cannot be honoured here. Findings below
are therefore from running the *current* lockfile and source against a
modern Node, with the workarounds noted. Treat them as "baseline on Node
22" rather than "baseline on Node 11" — re-run on Node 11 if/when that
becomes possible.

- **Cypress baseline:** could not run. The `cypress@4.5.0` postinstall
  tries to download the Cypress App binary from
  `https://download.cypress.io/desktop/4.5.0?platform=linux&arch=x64`,
  which the sandbox returns `403 Forbidden` for.
  - Workaround used to make `npm install` complete:
    `CYPRESS_INSTALL_BINARY=0 npm install --include=dev`.
  - Without the binary, `npx cypress run` exits 1 with
    `Cypress executable not found at: /root/.cache/Cypress/4.5.0/Cypress/Cypress`.
  - Test files exist (`cypress/integration/model/recommendation_test.js`,
    `cypress/integration/model/swrl_test.js`) so the baseline pass/fail
    count is **unknown — needs a host where the Cypress 4.5 binary can be
    fetched** (or, faster, defer the real baseline to Phase 6 when Cypress
    is upgraded to a version whose binary is reachable).
- **Type-check baseline (count of errors): 837 errors.**
  - No local `typescript` is in `devDependencies`, so `npx tsc` resolved to
    TypeScript **6.0.2**.
  - On TS 6, `tsconfig.json`'s `"moduleResolution": "node"` is now a hard
    error (`error TS5107`), so a bare `npx tsc --allowJs --noEmit` fails
    fast with a *single* config error and never reaches `src/`.
  - To get an actual source-code baseline, ran:
    `npx tsc --allowJs --noEmit --ignoreDeprecations 6.0` →
    **837 `error TS…` lines, exit 2**. Full log at `/tmp/tsc-baseline2.log`
    (not committed). Errors are dominated by `TS2339: Property X does not
    exist on type 'Object'` (JSDoc typing of Firestore docs as `Object`)
    and `TS2531: Object is possibly 'null'`.
  - Phase 2 / Phase 6 should pin `typescript` in `devDependencies` and
    either fix the `moduleResolution` value to `"node10"` / `"bundler"` or
    add `"ignoreDeprecations": "6.0"` so `npx tsc` works without a flag.
- **Local `npm start` works? Y — once the following workarounds are
  applied** (this is the *real* baseline state — `npm start` does **not**
  work on this stack out of the box):
  1. `npm install --include=dev` is required. A plain `npm install`
     with `npm@10` against this lockfile produces a `node_modules/`
     missing `babel-loader` (and probably others), causing the webpack
     build to fail with
     `Error: Can't resolve 'babel-loader' in '/home/user/SwrlList2'`.
  2. `cordova` must be installed globally (`npm install -g cordova@8.1.2`)
     because `npm start` runs `cordova prepare browser` and there's no
     local cordova binary.
  3. Node 17+ requires `NODE_OPTIONS=--openssl-legacy-provider` for the
     bundled webpack 4.43 (otherwise webpack dies with
     `error:0308010C:digital envelope routines::unsupported`).
  4. With (1)–(3) in place: `cordova prepare browser` succeeds and
     produces `platforms/browser/www/bundle.js` (~812 KB) on the first
     run — the "3× prepare" workaround in `heroku-postbuild` was not
     needed here, possibly because of the newer cordova-fetch /
     install order on Node 22. Leaving it in `heroku-postbuild` is still
     correct per `CLAUDE.md` guidance.
  5. `node server.js` then serves on port 8000 and all deep-link routes
     return HTTP 200:
     - `/api/v1/health` → 200 `{"isAvailable":true}`
     - `/swrl/bundle.js` → 200 (812 613 bytes)
     - `/swrl/foo`, `/swrler/foo`, `/recommend/foo`, `/recommendations`,
       `/savedsearches`, `/watch`, `/read`, `/listen`, `/play` → all 200
       (serving `index.html`)
  6. *Functional* in-app behaviour (Firestore reads, login flow, FCM)
     was **not** exercised — that needs a real browser session and
     Firebase auth credentials. Static serving is verified; runtime
     correctness is not.
- **All hard-coded `herokuapp.com` references (file:line):**
  - `config.xml:7` — `<author href="https://swrl-list.herokuapp.com/">`
  - `functions/index.js:72` — notification `icon`
  - `functions/index.js:73` — notification `click_action`
  - `src/screens/homeScreen.js:51` — `og:url`
  - `src/screens/homeScreen.js:53` — `og:image`
  - `src/screens/listScreen.js:56` — `og:url`
  - `src/screens/listScreen.js:58` — `og:image`
  - `src/screens/recommendationsScreen.js:55` — `og:url`
  - `src/screens/recommendationsScreen.js:57` — `og:image`
  - `src/screens/recommendScreen.js:55` — `og:url`
  - `src/screens/savedSearchesScreen.js:53` — `og:url`
  - `src/screens/savedSearchesScreen.js:55` — `og:image`
  - `src/screens/swrlerListScreen.js:54` — `og:url`
  - `src/screens/swrlerListScreen.js:56` — `og:image`
  - `src/screens/swrlScreen.js:53` — `og:url`
  - (Self-references in this `MIGRATION_PLAN.md` excluded.)
  - **13 source occurrences total**, across 8 files (7 view modules + 1
    Cloud Function + `config.xml`). Phase 8 needs to swap these for the
    new domain — a single `og:url` / `og:image` helper would also be a
    cheap follow-up.
- **GCP project + region confirmed?** No — **user action required**
  before Phase 1 can deploy. See the `[!]` decisions section above for
  the open questions:
  - Reuse `swrl-1118` for Cloud Run, or new project?
  - Region (`europe-west1` vs `europe-west2`)?
  - Custom domain or `*.run.app` to start?
  - Confirm `gcloud` CLI is installed and authenticated locally.
- **Anything surprising:**
  - Plain `npm install` on `npm@10` silently omits dev deps for this
    lockfile — `--include=dev` is mandatory. This is worth fixing even
    before Phase 2 because every contributor on a modern Node will hit
    it. Likely root cause: the lockfile was generated by a very old
    `npm@6.x` whose `dev`/`optional` markers don't round-trip cleanly
    through `npm@10`'s lockfile-version-3 upgrade ("npm warn old
    lockfile … This is a one-time fix-up").
  - The Cypress 4.5 binary URL is effectively dead from any sandboxed
    environment (and possibly soon from anywhere — Cypress have removed
    older binaries before). Phase 6's Cypress upgrade may have to come
    earlier than planned if we want a working CI baseline before the
    Cloud Run cutover.
  - `cordova prepare browser` emits a warning while installing
    `cordova-plugin-device`:
    `Failed to restore plugin "cordova-plugin-device" from config.xml.
     You might need to try adding it again. Error: code: engine.platform
     or engine.scriptSrc is not defined in custom engine "cordova-electron"
     from plugin "cordova-plugin-device" for browser warn`.
    The plugin still installs on the second pass, so this is non-fatal,
    but it's another data point for Phase 4's "Cordova is dead" decision.
  - 837 type errors is *not* a count of distinct bugs — the same
    "JSDoc-typed-as-Object" pattern recurs across most of `actions/` and
    `views/`. Real, novel errors are a much smaller subset. Phase 2
    should re-baseline on a pinned TS version before treating this as a
    target to drive down.
  - Branch divergence: `MIGRATION_PLAN.md` names the active branch as
    `claude/heroku-to-cloudrun-migration-bwAEL`, but PR #36 (the merge
    commit at HEAD, `c65bf51`) merged that branch into `master`. This
    Phase 0 work was done on `claude/start-migration-step-one-z89HD`
    per session instructions; future sessions should pick the correct
    long-lived branch and update the "Active branch" line at the top of
    this file.

---

## Phase 1 — Containerise & deploy current stack to Cloud Run

The fastest path off Heroku. We keep Node 11 and Cordova 8 for now.
Goal: a `gcloud run deploy` that works.

- [ ] Add `Dockerfile` at repo root that:
      - Uses `node:11.7.0` base image (yes, ancient, intentional for this
        phase)
      - Runs `npm install -g cordova@8.1.2`
      - Runs `npm ci` (or `npm install` if lockfile is incompatible)
      - Runs `cordova platform add browser` then `cordova prepare browser`
        three times (mirrors `heroku-postbuild`)
      - Exposes port 8080 (Cloud Run default)
      - `CMD ["node", "server.js"]`
- [ ] Add `.dockerignore` covering `node_modules`, `platforms`, `plugins`,
      `cypress/videos`, `cypress/screenshots`, `.git`
- [ ] Update `server.js` to default to `process.env.PORT || 8080` (Cloud Run
      injects `PORT=8080`)
- [ ] Add `cloudbuild.yaml` (or document the `gcloud builds submit` /
      `gcloud run deploy --source` flow) for the deploy
- [ ] Build the image locally: `docker build -t swrllist2:test .`
- [ ] Run it locally: `docker run -p 8080:8080 swrllist2:test` and verify
      `/api/v1/health` returns `{"isAvailable":true}`
- [ ] Verify a representative deep-link route (e.g. `/swrl/<id>`) serves
      `index.html`
- [ ] Push image to Artifact Registry (user runs `gcloud` commands)
- [ ] Deploy to Cloud Run, confirm public URL responds
- [ ] Update `src/firebase/init.js` `authDomain` and any other URLs only if
      the domain changes (otherwise leave Firebase config untouched)
- [ ] **Do not** delete `Procfile` or `heroku-postbuild` yet — keep them as a
      fallback until Phase 8

### Phase 1 acceptance criteria

- Public Cloud Run URL serves the app
- All deep-link routes (`/swrl/:id`, `/swrler/:id`, `/recommend/:id`,
  `/recommendations`, `/savedsearches`, `/watch`, `/read`, `/listen`,
  `/play`) return 200 and render
- Firestore reads/writes still work (auth still works)
- Type-check status unchanged from Phase 0 baseline
- Cypress status unchanged from Phase 0 baseline

### Phase 1 handoff notes

- Cloud Run service name:
- Cloud Run URL:
- Image registry path:
- Anything that needed to be patched to make Node 11 build in Docker:

---

## Phase 2 — Node + build tooling upgrade (web)

We're on Cloud Run; now we modernise the build. Big breaking-change phase.
Do this on Cloud Run, *not* against Heroku.

- [ ] Bump `engines.node` to `20` in `package.json`
- [ ] Update Dockerfile base image to `node:20-alpine` (or `node:20-slim`)
- [ ] Drop `npm install -g cordova@8.1.2` from Dockerfile if Phase 4 has
      moved off Cordova; otherwise bump to `cordova@12`
- [ ] Bump dev deps to current latest:
      - `@babel/core`, `@babel/preset-env`, `@babel/runtime`,
        `@babel/plugin-transform-runtime`,
        `@babel/plugin-proposal-class-properties` (note: now part of
        preset-env, can be removed)
      - `babel-loader` → 9.x
      - `webpack` → 5.x, add `webpack-cli`
      - `style-loader`, `css-loader`, `sass-loader`, `file-loader` (or
        replace `file-loader` with webpack 5 `asset/resource`)
- [ ] Bump runtime deps:
      - `express` → 4.x latest (Express 5 is a separate decision; flag it)
      - `html-entities` → current major
      - `abortcontroller-polyfill` → likely deletable on Node 20 / modern
        browsers, evaluate
      - `typeface-*` packages are deprecated; either keep as-is or migrate
        to `@fontsource/*` (small win, do it if cheap)
- [ ] Update `webpack.config.js`:
      - Webpack 5 syntax (no `mode` changes; `file-loader` → `asset/resource`)
      - Confirm `entry`/`output` still correct (output should still target
        `www/bundle.js`)
      - Use the inline-loader-string for SCSS no longer works in Webpack 5;
        convert to the array form (`['style-loader', 'css-loader', 'sass-loader']`)
- [ ] `.babelrc`: drop `@babel/plugin-proposal-class-properties` if dropped
      above; bump `targets` if specified
- [ ] Resolve any peer-dep / install errors (this is the slog)
- [ ] `npm run build` (add a `build` script that runs webpack directly,
      independent of Cordova) → produces `www/bundle.js`
- [ ] Type-check + Cypress green
- [ ] Local `docker build` + `docker run` works on Node 20

### Phase 2 acceptance criteria

- `node --version` in container is 20.x
- `npm install` in container completes with no errors (warnings OK)
- App runs and Firestore reads/writes work, identical UX to Phase 1
- Type-check has no *new* errors vs baseline

### Phase 2 handoff notes

- Final dep versions chosen:
- Anything that had to be replaced (not just bumped):
- New build command for the web bundle (independent of Cordova):

---

## Phase 3 — Firebase SDK upgrade

The codebase uses `firebase@7` with the namespaced compat-style API.
Upgrade to `firebase@10` (or latest) using the `firebase/compat/*` import
paths first — that keeps every call site working unchanged.

- [ ] Bump `firebase` to current major in `package.json`
- [ ] Replace imports across `src/`:
      - `require("firebase/app")` → `require("firebase/compat/app")`
      - `require("firebase/auth")` → `require("firebase/compat/auth")`
      - `require("firebase/firestore")` → `require("firebase/compat/firestore")`
      - `require("firebase/messaging")` → `require("firebase/compat/messaging")`
      - All `firebase.firestore.X` namespaced refs continue to work via compat
- [ ] Re-run type-check; fix typing drift
- [ ] Verify auth, Firestore reads/writes, FCM in the running app
- [ ] **Optional, separate sub-task** (do not tick Phase 3 for this):
      migrate to fully modular API. This is a much larger refactor and
      should be its own phase if pursued.

### Phase 3 acceptance criteria

- App boots, login works, Firestore subscriptions fire, messaging token
  registers
- No new type-check errors
- Cypress passes

### Phase 3 handoff notes

- Firebase version landed on:
- Any compat-shim that *didn't* work and required modular-API migration:

---

## Phase 4 — Mobile shell (Cordova upgrade or Capacitor migration)

**Decision required first.** This is *not* on the critical path for getting
off Heroku — only do this when web (Phases 1-3) is solid.

### Option A: Cordova 8 → Cordova 12

- [ ] Bump `cordova-android` → 13.x
- [ ] Bump `cordova-ios` → 7.x
- [ ] Bump `cordova-browser` → latest
- [ ] Replace deprecated plugins (`cordova-universal-links-plugin` is
      effectively abandoned — switch to Android App Links / iOS Universal
      Links via native config)
- [ ] Bump `android-targetSdkVersion` to current Play Store requirement
- [ ] Drop `cordova-plugin-compat`, `cordova-plugin-webpack` (Webpack should
      be invoked directly now via the script added in Phase 2)
- [ ] Update Fastlane lanes for new Gradle / build-tools versions

### Option B: Migrate to Capacitor 6

- [ ] `npm install @capacitor/core @capacitor/cli`
- [ ] `npx cap init`
- [ ] Add `android` and `ios` platforms via Capacitor
- [ ] Map each Cordova plugin to its Capacitor equivalent:
      - `cordova-plugin-device` → `@capacitor/device`
      - `cordova-plugin-network-information` → `@capacitor/network`
      - `cordova-plugin-inappbrowser` → `@capacitor/browser`
      - `cordova-plugin-browsertab` → drop (use `@capacitor/browser`)
      - `cordova-plugin-customurlscheme` → Capacitor `App` plugin URL
        handlers
      - `cordova-universal-links-plugin` → Capacitor `App` deep links + native
        App Links/Universal Links config
- [ ] Replace `document.addEventListener('deviceready', …)` in
      `src/index.js` — Capacitor doesn't use `deviceready`. Use
      `Capacitor.isNativePlatform()` and the `App` plugin instead.
- [ ] Update Fastlane to drive Capacitor's `android/` and `ios/` projects

### Phase 4 acceptance criteria

- Web build still produces a working `www/bundle.js`
- Android build produces an installable APK / AAB on emulator
- iOS build status documented (may be blocked on signing — that's OK)

### Phase 4 handoff notes

- Chose Option A or B?:
- Plugin replacements applied:
- Fastlane changes:

---

## Phase 5 — Cloud Functions upgrade

Only if Cloud Functions are still in use (see decisions above).

- [ ] `functions/package.json`: `engines.node` → `20`
- [ ] Bump `firebase-functions` to v6 (note: v2 → v6 is a breaking jump;
      `functions.firestore.document(...)` is now
      `onDocumentWritten(...)` etc.)
- [ ] Bump `firebase-admin` to current major
- [ ] Bump `node-fetch` (v3 is ESM only; either stay on v2 or migrate
      `functions/index.js` to ESM, or use built-in `fetch` on Node 18+ and
      drop `node-fetch` entirely)
- [ ] Rewrite `userActivityNotification` and `recommendationNotification` in
      v6 syntax
- [ ] Replace deprecated `admin.messaging().sendToDevice` (FCM legacy API
      shutdown June 2024) with `admin.messaging().sendEachForMulticast` or
      `send`
- [ ] Update Pushover token storage: `functions.config()` is removed in
      v6 — use environment variables / Secret Manager
- [ ] Test locally with the Functions emulator
- [ ] Deploy: `firebase deploy --only functions`

### Phase 5 acceptance criteria

- Both functions deploy without warnings
- Recommendation notification fires end-to-end (test with two accounts)
- Pushover notification fires on new login (or is disabled, document which)

### Phase 5 handoff notes

- API used to replace `sendToDevice`:
- Where Pushover token now lives:

---

## Phase 6 — Test & type-check upgrade

- [ ] Cypress 4.5 → 14.x. Major breakage to expect:
      - Test runner config moves from `cypress.json` to `cypress.config.js`
      - `cy.route` → `cy.intercept`
      - Node 12+ required (we'll already be on 20)
- [ ] Convert `cypress.json` to `cypress.config.js`
- [ ] Update tests for any Cypress 5/6/7/12 breaking changes
- [ ] Bump `typescript` if it's pinned (currently implicit) and re-baseline
      type-check errors
- [ ] Add `npm test` that runs both type-check and Cypress

### Phase 6 acceptance criteria

- `npm test` exits zero
- Cypress test count unchanged or higher

---

## Phase 7 — CI/CD on Cloud Build

- [ ] Add `cloudbuild.yaml`:
      - Step 1: build Docker image
      - Step 2: push to Artifact Registry
      - Step 3: `gcloud run deploy`
- [ ] Connect Cloud Build to GitHub repo, trigger on push to `master` (user
      may need to do this in console)
- [ ] Document the trigger setup in Readme
- [ ] (Optional) Add a Cypress / type-check step to Cloud Build before
      deploy, gated on success

### Phase 7 acceptance criteria

- Pushing to `master` (or a confirmed deploy branch) triggers an automated
  build + Cloud Run deploy
- Failed type-check / tests prevent deploy

---

## Phase 8 — Cleanup & docs

- [ ] Delete `Procfile`
- [ ] Delete `heroku-postbuild` script from `package.json`
- [ ] Delete `package-lock.json-bkp`
- [ ] Update `Readme.md`:
      - Remove Heroku setup section
      - Add Cloud Run deploy section (or just point at `gcloud run deploy`
        + Cloud Build trigger)
      - Update Node version
      - Update test commands
- [ ] Update `CLAUDE.md`:
      - Remove `git push heroku master` row
      - Update Node version row
      - Update Firebase SDK note if Phase 3 went modular
      - Update mobile-shell skill reference if Phase 4 chose Capacitor
        (rename `swrl-cordova-build` skill, or note both)
- [ ] Replace any remaining `swrl-list.herokuapp.com` references with the
      new domain (search list compiled in Phase 0)
- [ ] Update `config.xml` `<author href>` URL
- [ ] Update `functions/index.js` notification `icon` and `click_action`
      URLs
- [ ] Tag release: `git tag post-migration-v1`

### Phase 8 acceptance criteria

- No Heroku references remain anywhere in the repo (search confirms)
- Readme matches reality
- Fresh contributor could deploy from the docs alone

---

## Open risks / known unknowns

- **Cordova 8 + Node 20 will not coexist.** Phase 1 stays on Node 11
  *deliberately* so we don't fight this until Phase 2/4.
- **`cordova-plugin-webpack@0.0.2`** is essentially unmaintained. After
  Phase 2 we should be invoking webpack directly and treating Cordova as
  just a packager, not a build tool.
- **`firebase/messaging` over HTTP** does not work — service workers need
  HTTPS. Cloud Run gives this for free, Heroku did too, but local Docker
  testing may show messaging registration failures (this is fine and
  expected).
- **Universal Links / App Links** (`swrl1118.page.link`) — Firebase Dynamic
  Links is shutting down in 2025. This is an independent, separate
  migration not covered by this plan; flag it to the user.

---

## Session-resume checklist

When resuming a session on this work:

1. `git status` and `git log --oneline -5` — see what shipped last session
2. Open this file, find the first unticked `[ ]` in the active phase
3. Read that phase's handoff notes from prior sessions
4. If a phase is `[!]` blocked, surface the decision to the user before
   doing anything else
5. Always run `npx tsc --allowJs --noEmit` and `npx cypress run` before
   ticking a phase complete
6. Update handoff notes before stopping
