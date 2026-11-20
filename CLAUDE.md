# Swrl List 2 — Agent guide

A web app (installable PWA) where users save things to **watch, read, listen
to, or play** and recommend them to friends. Backed by Firebase (Firestore +
Auth + Cloud Messaging + Cloud Functions), served from Google Cloud Run.

This file is a **routing layer**. It tells you where the code lives and which
skill to load when you touch a specific area. Keep it short — put deep
knowledge in the skills.

## Stack

- Node 24, webpack 5 (no Babel), plain modern JS with JSDoc types
- Firebase JS SDK, **modular** API (`firebase/firestore`, `firebase/auth`, ...)
- Express 5 on Google Cloud Run (Docker); terraform + GitHub Actions deploy
- Vitest for unit tests; TypeScript only as a type-checker (`tsc`, `checkJs`)
- Firestore security rules in `firestore.rules`, tested with the emulator (`test-rules/`)
- Cloud Functions on Node 22 (`functions/`, its own `package.json`)

## Daily commands

| Task | Command |
| --- | --- |
| Build | `npm run build` (webpack → `dist/`) |
| Run locally | `npm start` after a build (`http://localhost:8080`) |
| Type-check + unit tests | `npm test` |
| Cloud Functions tests | `cd functions && npm test` |
| Firestore rules tests (needs Java, not in CI) | `npm run test:rules` |
| Deploy | merge to `master` (`.github/workflows/deploy.yml`) |

## Source map

```
src/
  actions/        user-initiated mutations — write to Firestore
  components/     small reusable DOM pieces (buttons, swrl card, toaster)
  constants/      enums: Category, Type, Filter, Sort, View, Collection, ...
  detailGetters/  3rd-party detail fetchers (TMDB, OpenLibrary, iTunes, BGG)
  firebase/       init, login, messaging, swrler (user profile) helpers
  listeners/      Firestore onSnapshot subscriptions (my list entries, friends, inbox, ...)
  model/          data classes (Swrl, State, Recommendation, Rating, ...)
  screens/        top-level screens that host Views (list, swrl, swrler, friends, settings, ...)
  search/         per-category search strategies (watch/read/listen/play)
  utils/          swipe, zip, property checker
  views/          DOM-rendering views; orchestrated by views/stateController.js
  index.js        entry point — starts the app on DOM ready

www/              static files: index.html, css, images, manifest, service workers
test/             Vitest unit tests (model classes, pure helpers)
test-rules/       Vitest tests of firestore.rules against the Firestore emulator
functions/        Firebase Cloud Functions + their tests
scripts/          one-off helpers (migrate-list-entries.js, Auth authorised domains, ...)
docs/             design notes; friends-and-visibility-plan.md is the spec and the owner's rollout checklist;
                  user-journeys.md lists every screen a change may have to reach;
                  quick-add.md: the fastest ways to add a swrl (shortcuts, sharing, the iOS Shortcut)
firestore.rules   security rules (applied by hand in the console, not by CI)
firestore.indexes.json  the few indexes the new queries need (added by hand in the console)
firebase.emulators.json emulator config (auth, firestore with the rules, functions)
server.js         Express server used on Cloud Run (static app + third-party API proxies)
webpack.config.js builds www/ + src/ into dist/
Dockerfile        Cloud Run image: webpack build → Express
terraform/        all GCP infrastructure, applied by GitHub Actions (see terraform/README.md)
```

**Data:** who has a swrl on a list lives in per-user docs
`swrlers/{uid}/listEntries/{swrlID}` (flags, visibility). The shared
`swrls/{id}` doc holds details and anonymous counts only, never uids; the
counts are written by Cloud Functions. Details in the `swrl-firebase` skill.

**Pipeline:** user input → `actions/*` → Firestore write → `listeners/*`
`onSnapshot` → update in-memory caches → `State` → `StateController.changeState`
→ `views/*` render DOM.

## When to load which skill

| You are… | Load skill |
| --- | --- |
| Adding/modifying a screen, view, or the state pipeline | `swrl-architecture` |
| Touching Firestore (data model, rules, indexes, migration), auth, messaging, or Cloud Functions | `swrl-firebase` |
| Adding a new content source (new Type or 3rd-party API) | `swrl-detail-getters` |
| Building, running or deploying (webpack, Docker, CI, Cloud Run) | `swrl-build-deploy` |
| Writing or running tests, or fixing type errors | `swrl-testing` |
| Designing, restyling or polishing the UI, or writing interface copy | `swrl-ux` (the app's own rules, patterns and audit); `design-taste-frontend` is background only (third-party; read its "In this repository" section) |
| Building a user-visible feature end-to-end | launch the `swrl-feature-builder` agent, and walk `docs/user-journeys.md` first |

## Versioning and shipping

- **Semantic versioning, bumped in every PR.** `version` in `package.json`
  (and `package-lock.json`; use `npm version --no-git-tag-version <x.y.z>`) is
  shown in the app's menu, so the owner can confirm which build is live. Patch
  for fixes and small tweaks, minor for new features, major for breaking
  changes (data model or rules changes that need owner action). One bump per PR.
- **By default, open a PR and auto-merge it** when the work is done: push the
  branch, open the PR against `master`, enable auto-merge (or merge once CI is
  green if auto-merge is unavailable). A merge deploys the live site, so never
  merge with red or unfinished CI. Say in the PR and to the owner which version
  it ships.

## Every change: cover every journey, plan the docs, check the layout

- **Cover every user journey.** Before coding a feature or a change to what a
  swrl shows (a state, a field, a button), go down `docs/user-journeys.md`
  and mark each journey "changes" or "not affected, because ...". Build all
  the ones that change in the same PR, test each in the browser, and put the
  list in the PR. A feature that works on one screen only is not done.
- **Consult the UX skill** (`swrl-ux`) for any UI: reuse its patterns, follow
  its rules, run its `audit.js` checks, and tick off any of its "Known gaps"
  you fix.

- **Plan the .md updates at the start, ship them in the same PR.** Before
  coding, list which of `CLAUDE.md`, `.claude/skills/*/SKILL.md`,
  `.claude/agents/*.md` and `docs/*.md` describe what you are changing (data
  shapes, files, flows, UI patterns, how to test) and update each one in the
  PR. Say in the PR which .md files changed, or why none needed to.
- **Phone and desktop are both first-class.** Swrl List is an app on phones
  and a website on computers: design and check both, and never ship a phone
  layout stretched across a desktop (see `swrl-ux`, "Desktop").
- **Check UI by measuring, not just looking.** Screenshots at 360, 390 and
  430px wide (and 1280 and 1440 on desktop, plus a Tab-through); for any row of buttons or cards, compare
  their `getBoundingClientRect()` top, height and icon positions in Playwright,
  with the longest labels (e.g. "Start reading", "Mark as done"). Misaligned
  rows have shipped more than once because a screenshot looked fine at a glance.

## Guardrails

- **Never edit `dist/` or anything under `node_modules/`** — generated. Fix
  the source, re-run the build.
- **Never commit API keys or secrets.** Firebase _web_ config in
  `src/firebase/init.js` is a public client config, not a secret — but do not
  copy it around or put it in docs.
- **The shared `swrls/{id}` doc never holds uids or user state** (the legacy
  `later`/`done`/`deleted`/`loved`/`isRecommended` arrays are gone and the rules
  refuse them); per-user state goes in `listEntries`. Clients never write the
  count fields. The public `swrlers/{uid}` profile never holds an email.
- **Friend search is by display name only**; never match or show email.
- **`firestore.rules` and the indexes are applied by hand** in the Firebase
  console; CI only deploys functions. Change rules with a test in `test-rules/`
  and say in the PR that someone has to publish them.
- **Firebase is used through the modular API.** Never import
  `firebase/compat/*`.
- **TMDB, OMDb and BoardGameGeek calls go through `server.js`**
  (`/api/v1/tmdb/*`, `/api/v1/omdb`, `/api/v1/geek/*`; also the keyless
  `/api/v1/itunes/*` and `/api/v1/oembed/spotify`), which holds
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
