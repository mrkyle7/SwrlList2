---
name: swrl-testing
description: Use when writing or running tests, or debugging type errors in `src/`. Covers the unit tests (Vitest), the type-check, the Cloud Functions tests and what is not covered.
---

# Testing

```bash
npm test                 # tsc (type-check) then vitest
npm run typecheck        # tsc only
npx vitest               # watch mode
cd functions && npm test # node --test, for the Cloud Functions helpers
```

CI runs all of these on every pull request, then builds the Docker image and
checks it serves the app.

## What exists

- `test/*.test.js` - Vitest unit tests for the model classes
  (`Swrl.fromFirestore`, `Recommendation.fromFirestore`). They import from
  `src/model/*` and build fake Firestore docs by hand:
  `{ id, data: () => ({...}) }`, with `Timestamp` from `firebase/firestore`
  for dates. No live Firestore.
- `functions/test/*.test.js` - tests for the pure helpers in
  `functions/messages.js`.
- The type-check must pass with zero errors. `tsconfig.json` checks the JS
  through JSDoc (`checkJs`, not `strict`). Firebase types are written as
  `import('firebase/firestore').Firestore` etc.

## What does not

There are no browser / end-to-end tests in the repo. If you add some:

1. Serve a build (`npm run build && npm start`).
2. Use the Firebase emulators (`npm run build:emulators`, see the
   `swrl-firebase` skill) or block Firebase - do **not** run tests against
   the live `swrl-1118` project. The Auth emulator's sign-in popup can be
   driven from Playwright.
3. Stub `/api/v1/*` rather than calling the real third-party APIs.
