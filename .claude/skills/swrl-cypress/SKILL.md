---
name: swrl-cypress
description: Use when writing or running Cypress tests, or debugging type errors in `src/`. Covers the current scope of testing (model-level only, no end-to-end UI), how to run, and how to add new tests.
---

# Cypress testing

## Scope today

Cypress is used as a **unit/integration test runner for model classes**, not
for real browser end-to-end flows. All tests live in
`cypress/integration/model/`:

- `swrl_test.js` — `Swrl.fromFirestore` round-trips
- `recommendation_test.js` — `Recommendation.fromFirestore` parsing

They run as regular `describe`/`context`/`it` blocks. They import directly
from `src/model/*` and construct fake Firestore doc objects by hand — there
is no live Firestore in tests.

No `cy.visit(...)` / `cy.get(...)` browser automation exists yet. If you need
an end-to-end UI test, be aware you'll be the first to add one.

## Running

```bash
npx cypress run            # headless, all specs
npx cypress open           # interactive runner (needs a display)
```

`cypress.json` is empty (defaults only).

## Type checking alongside

The project relies heavily on JSDoc types with `checkJs: true`. Run:

```bash
npx tsc --allowJs --noEmit
```

…to check the whole `src/` tree before landing a change. CI does not run
this (no CI config is present) — it's a local gate.

## Adding a model test

1. Copy an existing file in `cypress/integration/model/`.
2. Import the class under test from `src/model/…`.
3. Build a plain object that mimics a Firestore `DocumentSnapshot` —
   `{ id, data: () => ({...}) }` — the existing tests use this shape.
4. For timestamps in the fake doc, use objects with a `.toDate()` method;
   the model classes call `.toDate()` directly.
5. Assert via `expect(...)` — Chai comes bundled with Cypress.

## Adding UI tests (when the time comes)

You'll need to:

1. Serve the app first (`npm start` in another process).
2. Set `baseUrl` in `cypress.json` to `http://localhost:8000`.
3. Stub Firestore — do **not** run tests against the live `swrl-1118`
   project. Either use the Firebase emulator suite or mock at the listener
   boundary.
4. Write specs under a new `cypress/integration/e2e/` directory to keep
   model tests distinct.

## Gotchas

- Cypress is pinned to **4.5.0**. Modern Cypress (13+) has a very different
  config file format (`cypress.config.js` vs `cypress.json`). Don't copy
  examples from current docs wholesale.
- Tests import from `src/model/*` which imports Firebase v7. If you add
  a module that uses browser-only APIs (`document`, `window` for DOM
  rendering), tests won't be able to import from it without a polyfill.
  Keep model classes DOM-free — they already are.
- `cypress/fixtures/example.json` is a placeholder from `cypress init`.
  Safe to ignore.
