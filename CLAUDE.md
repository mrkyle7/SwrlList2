# Swrl List 2 — Agent guide

A Cordova hybrid app (iOS / Android / Browser) where users save things to
**watch, read, listen to, or play** and recommend them to friends. Backed by
Firebase (Firestore + Auth + Cloud Messaging + Cloud Functions).

This file is a **routing layer**. It tells you where the code lives and which
skill to load when you touch a specific area. Keep it short — put deep
knowledge in the skills.

## Stack (ancient — do not silently upgrade)

- Cordova 8.1.2, webpack + Babel, Node **11.7.0** (EOL)
- Firebase JS SDK 7.x (pre-modular, compat-style API)
- Cypress 4.5 for integration tests
- Type-checking via `tsc --allowJs --noEmit` driven by `tsconfig.json` /
  `jsconfig.json` + JSDoc
- Express + Heroku for the browser deploy; Fastlane for Android; Xcode for iOS

Any dependency bump is a real project, not a drive-by. Ask before upgrading.

## Daily commands

| Task | Command |
| --- | --- |
| Run browser dev server | `npm start` (triggers `cordova prepare browser`) |
| Run integration tests | `npx cypress run` |
| Type-check | `npx tsc --allowJs --noEmit` |
| Deploy browser | `git push heroku master` |
| Deploy Android | `bundle exec fastlane android deploy` |

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
  index.js        entry point — wires up Cordova deviceready

functions/        Firebase Cloud Functions
cypress/          integration tests (currently model-level only)
fastlane/         Android store metadata + lanes
scripts/          build helpers (e.g. post-add-browsertab fix)
server.js         Express server used on Heroku
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
| Running or debugging Cordova / Heroku / Fastlane builds | `swrl-cordova-build` |
| Writing or running Cypress tests | `swrl-cypress` |
| Building a user-visible feature end-to-end | launch the `swrl-feature-builder` agent |

## Guardrails

- **Never edit `platforms/`, `www/bundle.js`, or anything under `node_modules/`** —
  they are build artefacts / generated. Fix the source, re-run the build.
- **Never commit API keys or secrets.** Firebase _web_ config in
  `src/firebase/init.js` is a public client config, not a secret — but do not
  copy it around or put it in docs.
- **Node version drift is a real hazard.** `engines.node` is 11.7.0. Many
  modern npm packages will not install cleanly. If `npm install` fails,
  suspect the Node version first, not the code.
- **Firebase SDK is v7 (compat).** Do _not_ reach for modular v9 imports
  (`firebase/app` namespaced imports are required here).
- **Cordova's `heroku-postbuild` calls `cordova prepare browser` three times
  on purpose** — a known workaround. Don't "tidy" it away.
- Raw DOM rendering, no framework. No React/Vue/Svelte. Don't import one.

## Unknowns worth asking about

- Whether the user has the iOS signing / Apple developer account set up
  (Readme says "I don't have yet!" as of last update)
- Whether Cloud Functions are currently deployed / used in production
- Whether there is a staging Firebase project or only `swrl-1118`
