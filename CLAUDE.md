# Swrl List 2 — Agent guide

A web app (installable PWA) where users save things to **watch, read, listen
to, or play** and recommend them to friends. Backed by Firebase (Firestore +
Auth + Cloud Messaging + Cloud Functions), served from Google Cloud Run.

This file is a **routing layer**. It tells you where the code lives and which
skill to load when you touch a specific area. Keep it short — put deep
knowledge in the skills.

## Stack

- Node 24, webpack 5 (no Babel), plain modern JS with JSDoc types
- Firebase JS SDK through its **compat** (namespaced) API
- Express 5 on Google Cloud Run (Docker); terraform + GitHub Actions deploy
- Vitest for unit tests; TypeScript only as a type-checker (`tsc`, `checkJs`)
- Cloud Functions on Node 22 (`functions/`, its own `package.json`)

## Daily commands

| Task | Command |
| --- | --- |
| Build | `npm run build` (webpack → `dist/`) |
| Run locally | `npm start` after a build (`http://localhost:8080`) |
| Type-check + unit tests | `npm test` |
| Cloud Functions tests | `cd functions && npm test` |
| Deploy | merge to `master` (`.github/workflows/deploy.yml`) |

## Source map

```
src/
  actions/        user-initiated mutations — write to Firestore
  components/     small reusable DOM pieces (buttons, swrl card, toaster)
  constants/      enums: Category, Type, Filter, Sort, View, Collection, ...
  detailGetters/  3rd-party detail fetchers (TMDB, OpenLibrary, iTunes, BGG)
  firebase/       init, login, messaging, swrler (user profile) helpers
  listeners/      Firestore onSnapshot subscriptions (inbox, sent, ...)
  model/          data classes (Swrl, State, Recommendation, Rating, ...)
  screens/        top-level screens that host Views
  search/         per-category search strategies (watch/read/listen/play)
  utils/          swipe, zip, property checker
  views/          DOM-rendering views; orchestrated by views/stateController.js
  index.js        entry point — starts the app on DOM ready

www/              static files: index.html, css, images, manifest, service workers
test/             Vitest unit tests (model classes)
functions/        Firebase Cloud Functions + their tests
scripts/          one-off helpers (Firebase Auth authorised domains)
server.js         Express server used on Cloud Run (static app + third-party API proxies)
webpack.config.js builds www/ + src/ into dist/
Dockerfile        Cloud Run image: webpack build → Express
terraform/        all GCP infrastructure, applied by GitHub Actions (see terraform/README.md)
```

**Pipeline:** user input → `actions/*` → Firestore write → `listeners/*`
`onSnapshot` → update in-memory caches → `State` → `StateController.changeState`
→ `views/*` render DOM.

## When to load which skill

| You are… | Load skill |
| --- | --- |
| Adding/modifying a screen, view, or the state pipeline | `swrl-architecture` |
| Touching Firestore, auth, messaging, or Cloud Functions | `swrl-firebase` |
| Adding a new content source (new Type or 3rd-party API) | `swrl-detail-getters` |
| Building, running or deploying (webpack, Docker, CI, Cloud Run) | `swrl-build-deploy` |
| Writing or running tests, or fixing type errors | `swrl-testing` |
| Building a user-visible feature end-to-end | launch the `swrl-feature-builder` agent |

## Guardrails

- **Never edit `dist/` or anything under `node_modules/`** — generated. Fix
  the source, re-run the build.
- **Never commit API keys or secrets.** Firebase _web_ config in
  `src/firebase/init.js` is a public client config, not a secret — but do not
  copy it around or put it in docs.
- **Firebase is used through the compat API** (`firebase/compat/*`). Don't mix
  in modular imports piecemeal.
- **TMDB, OMDb and BoardGameGeek calls go through `server.js`**
  (`/api/v1/tmdb/*`, `/api/v1/omdb`, `/api/v1/geek/*`), which holds
  `TMDB_API_KEY`, `OMDB_API_KEY` and `BGG_API_TOKEN` (from Secret Manager).
  Never put an API key in `src/`; local runs need them as environment
  variables.
- **Infrastructure changes go through `terraform/`**, not `gcloud` by hand —
  the next apply undoes manual changes. Secret values never go in terraform:
  GitHub Actions secrets are copied into Secret Manager by the deploy job.
- **`npm test` must pass with zero type errors** — CI gates merges on it.
- Raw DOM rendering, no framework. No React/Vue/Svelte. Don't import one.
- Ask before major dependency bumps; verify with a real build and `npm test`.

## Unknowns worth asking about

- Whether there is a staging Firebase project or only `swrl-1118`
