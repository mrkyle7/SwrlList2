---
name: swrl-architecture
description: Use when adding or modifying a screen, view, or anything touching the State → StateController → View pipeline. Covers the actions / listeners / state / views layering that the rest of the app is built on.
---

# Swrl architecture

## The pipeline

```
 user input
     │
     ▼
 actions/<verb>.js   ── writes to Firestore (merge:true on swrls/{swrlID})
                                   │
                                   ▼
                       listeners/*.js  (onSnapshot)
                                   │
                                   ▼
                 in-memory caches (recommendationsInboxCache, ...)
                                   │
                                   ▼
                        model/State (one per "page")
                                   │
                                   ▼
                 views/stateController.js  changeState(newState)
                                   │
                                   ▼
                 view.show() → DOM render in the view's Screen
```

There is **no framework**. Views manipulate the DOM directly. Screens are
containers that views attach into.

## Key files

- `src/views/stateController.js` — owns every Screen + View instance, plus
  `currentState` and a `previousStates[]` back-stack. `changeState(newState)`
  destroys the old view, pushes the old state, and shows the new view. Also
  wires up the browser `device.platform === 'browser'` URL history.
- `src/model/state.js` — small data object describing "what is being shown":
  `view`, `selectedCategory`, `searchTerms`, `swrl`, `sort`, `filters`,
  `typeFilter`, `swrler`, `numberOfSwrlsToDisplay`. Construction takes a
  `UIView`.
- `src/views/UIView.js` — base class every view extends; has `show()`,
  `destroy()`, and knows its containing screen.
- `src/screens/Screen.js` — base class for screens (`homeScreen`, `listScreen`,
  `swrlScreen`, etc.). One screen may host multiple views (e.g. the list
  screen hosts `yourListView` and `discoverView`).
- `src/index.js` — Cordova `deviceready` → init Firebase → create the
  singleton `StateController` → set up login → show initial screen.

## Conventions

- **One action per file** in `src/actions/`. Each default-exports a function
  that takes `(swrl, firestore)` (sometimes extra args) and returns the
  Firestore promise. Use `FieldValue.arrayUnion` / `arrayRemove` on the
  `later` / `done` / `loved` / `deleted` / `isRecommended` arrays keyed by
  `swrlUser.uid`. Do **not** read-modify-write these arrays.
- **Listeners live in `src/listeners/`** and export both
  `setUpXListener(firestore)` and `cancelXListener()`, plus a mutable cache
  object that views read from. Errors count up into a local `errorCount`
  variable so repeated failures are visible in the console.
- **State is transient.** Don't put persistent data on `State` — it's a
  snapshot of what the user is looking at. Persistent data goes in Firestore
  caches or on `swrlUser`.
- **JSDoc is the type system.** `tsconfig.json` runs with `checkJs: true`.
  Add `@param` / `@type` / `@return` JSDoc to new functions and it will be
  type-checked by `npx tsc --allowJs --noEmit`.

## Adding a new view

1. Create `src/views/myView.js` extending `UIView`. Implement `show()` (build
   + inject DOM) and `destroy()` (remove listeners + DOM).
2. If it needs its own screen, create `src/screens/myScreen.js` extending
   `Screen`. Otherwise reuse an existing one.
3. In `StateController`'s constructor, instantiate the screen (if new) and
   the view — both receive `this` (the controller).
4. Add a trigger (button click, menu item, route) that builds a `new State(…)`
   with `view = stateController.myView` and calls `stateController.changeState(newState)`.
5. If the view needs Firestore data, prefer subscribing via an existing
   listener's cache. Add a new listener in `src/listeners/` only if you
   genuinely need a new query.

## Adding a new action

1. Create `src/actions/myAction.js` — one default-export function.
2. Import `swrlUser` from `../firebase/login` for the acting user's uid.
3. Use `firebase.firestore.FieldValue` for array updates and server
   timestamps. Never `Date.now()` — clock skew will bite you.
4. Return the Firestore promise so the caller can `await` / `.then(show toast)`.
5. Call it from a view/component on user interaction.

## Things that will bite you

- `StateController.changeState` assumes the _new_ state already has a `view`.
  Building a State without a view throws later, not at construction.
- Views must fully clean up in `destroy()`. Anything attached to `document`
  (listeners, intervals, Firestore subscriptions) will leak on every screen
  change otherwise — the DOM is reused.
- Screen identity in `changeState` is compared with
  `currentState.view.screen !== newState.view.screen`. If two views share a
  screen object, the back-stack won't push — that's intentional.
- `device.platform` comes from `cordova-plugin-device` and only exists after
  `deviceready`. Do not read it at module load.
