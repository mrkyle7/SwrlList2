---
name: swrl-testing
description: Use when writing or running tests, or debugging type errors in `src/`. Covers the unit tests (Vitest), the type-check, the Cloud Functions tests, the Firestore rules tests, the emulator end-to-end recipe and what is not covered.
---

# Testing

```bash
npm test                 # tsc (type-check) then vitest
npm run typecheck        # tsc only
npx vitest               # watch mode
cd functions && npm test # node --test, for the Cloud Functions helpers
npm run test:rules       # firestore.rules against the Firestore emulator (needs Java)
```

CI runs the first three on every pull request, then builds the Docker image and
checks it serves the app. `npm run test:rules` is NOT run by CI (no emulator
there): run it yourself whenever `firestore.rules` changes. It downloads
`firebase-tools@15` through `npx`, starts the emulator with `--only firestore`
and runs `test-rules/` (behind an HTTP proxy that may need the proxy variables
unset, see `swrl-firebase`).

## What exists

- `test/*.test.js` - Vitest unit tests for the model classes and the pure
  logic behind actions and views (`Swrl`, `Recommendation`, `ListEntry`,
  `listEntryWrite`, `friendRequest`, `visibilitySettings`, `accountDeletion`,
  ...). Put new decision logic in `src/model/*` as pure functions so it can be
  tested here. They import from `src/model/*` and build fake Firestore docs by hand:
  `{ id, data: () => ({...}) }`, with `Timestamp` from `firebase/firestore`
  for dates. No live Firestore.
- `functions/test/*.test.js` - `node --test` tests for the pure helpers in
  `functions/messages.js`, `listEntries.js` (count deltas, the migration's
  legacy-to-entries mapping) and `accountDeletion.js`.
- `test-rules/firestore.rules.test.js` - Vitest + `@firebase/rules-unit-testing`
  against the Firestore emulator: who may read and write each collection (owner,
  friend, stranger, anonymous, signed out), the query constraints rules demand,
  the legacy arrays and counts being refused. Add a case for every rule change.
- The type-check must pass with zero errors. `tsconfig.json` checks the JS
  through JSDoc (`checkJs`, not `strict`). Firebase types are written as
  `import('firebase/firestore').Firestore` etc.

## What does not

There are no browser / end-to-end tests in the repo, and the Cloud Functions
triggers (`index.js` wiring) and the migration script have no automated tests
beyond their pure helpers. To check them, run the emulators and drive the app by
hand or with Playwright (the recipe the friends-and-visibility work used):

1. Start Auth, Firestore (with the rules) and Functions, as in `swrl-firebase`
   (`firebase.emulators.json`, `--only auth,firestore,functions`, the proxy
   workaround, `functions/.secret.local` placeholders).
2. `npm run build:emulators && npm start` (app on `http://localhost:8080`).
3. Playwright (`require('playwright')`, `chromium.launch()`; the browsers are
   pre-installed in the sandbox, do not run `playwright install`). Sign in
   through the Auth emulator popup (`#login`, then in the popup
   `#add-account-button`, `#email-input`, `#display-name-input`, `#sign-in`).
   Use `viewport 390x844, deviceScaleFactor 2` for phone screenshots. Collect
   `console` errors and `pageerror` per browser context: "Missing or
   insufficient permissions" must not appear. (Without a TMDB key the
   `/api/v1/tmdb/*` calls return 400 and log "Could not get details"; expected.)
4. Seed and inspect data with the admin SDK from `functions/node_modules`
   (`firebase-admin`, with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085` and
   `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`); wipe between runs with
   `DELETE http://127.0.0.1:8085/emulator/v1/projects/swrl-1118/databases/(default)/documents`
   and `.../9099/emulator/v1/projects/swrl-1118/accounts`. Seed with the
   Functions emulator in mind: writing entries fires `listEntryCounts`.
5. To test legacy data and the migration: create the Auth users first (admin
   `createUser`; the popup links to a user with the same email), seed legacy
   `swrlers` and uid-array `swrls` with the admin SDK, run
   `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 ./scripts/migrate-list-entries.js`,
   wait, `--recount`, then use the app. Remember the functions are asynchronous:
   poll for the result rather than sleeping a fixed time.
6. Playwright tips for this app: the menu button exists only on the home
   screen; the left 32px of the page is a swipe strip (`#menuSwipeable`) that
   intercepts clicks (click the card title, not the poster); radio inputs on the
   Settings screen are styled, click their `label`; `window.confirm` dialogs
   need a `page.on('dialog')` handler.
7. Layout checks: screenshot at 360, 390 and 430px (and 1280 for desktop),
   and for rows of buttons assert in Playwright that every visible item has
   the same `getBoundingClientRect()` top and height and its icon the same
   top. Use the longest labels in every category ("Start reading",
   "Start listening", "Mark as done"). A screenshot alone has let ragged rows
   ship.
8. Do **not** run tests against the live `swrl-1118` project, and stub
   `/api/v1/*` rather than calling the real third-party APIs.
