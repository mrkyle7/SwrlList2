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
 actions/<verb>.js   ── writes to Firestore (my swrlers/{uid}/listEntries/{swrlID}
                                   │      + the shared swrls/{id} details; friend docs, ...)
                                   ▼
                       listeners/*.js  (onSnapshot)
                                   │
                                   ▼
                 in-memory caches (my list entries, friends and requests,
                 recommendation inbox/sent, ...)
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
- `src/listeners/` — `listEntries.js` (my entries: `getListEntry`,
  `getAllListEntries`, `whenListEntriesReady`, `getDefaultVisibility`,
  `addListEntriesChangeListener`), `friends.js` (my friends, incoming and sent
  requests: `isFriend`, `getFriends`, `getRelationshipTo`, `whenFriendsReady`,
  `addFriendsChangeListener`, the request badge), `recommendations.js` (inbox and
  sent, `isRecommendedToMe`), `privateComments.js`, `labels.js` (my private labels). They start in
  `src/firebase/login.js` for a signed-in, non-anonymous user and stop on
  logout; `pauseUserListeners` / `resumeUserListeners` bracket account deletion.
- `src/screens/` + `src/views/` — besides the list/swrl/swrler/recommendation
  screens: `friendsScreen` + `views/friends.js` (`/friends`: requests, friends,
  search by display name) and `settingsScreen` + `views/settings.js`
  (`/settings`: default visibility, swrl page layout, delete my account). Components shared by
  views: `components/friendControl.js` (Add friend / Cancel / Accept / Remove),
  `components/swrlVisibility.js` (per-swrl "Visible to").
- `src/index.js` — on DOM ready → init Firebase → create the
  singleton `StateController` → set up login → show initial screen.

## Conventions

- **One action per file** in `src/actions/`. Each default-exports a function
  and returns a promise. List actions take `(swrl, firestore)`; friend actions
  `(uid, firestore)`; `setDefaultVisibility(visibility, firestore)`;
  `setSwrlVisibility(swrlID, visibility | 'default', firestore)`.
  List actions (`addSwrlToList`, `markASwrlAsDone`, `loveASwrl`, ...) call
  `writeListEntry`, which sets flags on MY entry
  (`swrlers/{uid}/listEntries/{swrlID}`) and refreshes the shared swrl's
  details in one batch. Never write uid arrays or counts on `swrls/{id}`
  (the rules refuse them) and never read membership from the shared doc: use
  `getListEntry` from `src/listeners/listEntries.js` (wait for
  `whenListEntriesReady()` before deciding what to show, or a button says "not
  on my list"). Friend requests are created by the client; the friends docs and
  the counts are written by Cloud Functions, so the UI waits for the listeners
  to show the result (see the "Adding..." state in `views/friends.js`).
  Pure logic (what to write, who may see what, ordering of writes) lives in
  `src/model/*` with unit tests in `test/`; actions and views stay thin.
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
   For a screen with its own URL (like `/friends`, `/settings`) also: add the
   route to `appRoutes` in `server.js` and to the app-shell route list in
   `www/sw.js` (bump `CACHE`), add the deep link in `src/index.js` (anonymous
   visitors land on home), and for a menu item add the `<li>` in
   `www/index.html` and show/hide it in `src/firebase/login.js`. The hamburger
   menu only exists on the home screen.
5. If the view needs Firestore data, prefer subscribing via an existing
   listener's cache. Add a new listener in `src/listeners/` only if you
   genuinely need a new query.

## Adding a new action

1. Create `src/actions/myAction.js` — one default-export function.
2. Import `swrlUser` from `../firebase/login` for the acting user's uid.
3. Use the modular `serverTimestamp()` (and `arrayUnion` / `arrayRemove` only
   for non-membership arrays such as a recommendation's `read`). Never
   `Date.now()` — clock skew will bite you. Per-user state goes in my list
   entry (use `writeListEntry`), never on the shared `swrls` doc. If a rule
   would need to change, edit `firestore.rules` and add a `test-rules/` test.
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
- The app only runs in a browser; there is no platform switch. Routing uses
  the History API (`screen.updateLocationHistory`, `window.onpopstate`).
