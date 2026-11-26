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
  `components/swrlVisibility.js` (per-swrl "Visible to"), `components/listToolbar.js`
  (the Filter button and Compact / Detailed switch under the tabs of every list: one
  element each list view mounts at its top; the choice is `.main[data-list-view]`,
  which the stylesheet follows, so cards are built with their detailed parts and
  never redrawn on a switch).
- **Desktop (from 1025px wide; phones never see it):** `components/desktopSidebar.js`
  is the sidebar that replaces the menu button. It mirrors the slide-out menu
  (signed-in items, name, photo, inbox count, version) by watching those
  elements, and clicks the menu's own items. `StateController._updateDesktop()`
  marks the active item, sets `<body data-screen>` (the top bar hides on home) and
  the category tile by the title. `#centre` becomes a fixed area beside the
  sidebar, so the screens' absolute `top` offsets still hold. The swrl page
  moves its blocks into the header and two columns on desktop
  (`placeForDesktop` in `views/swrlFullPage.js`, `data-layout="desktop"`) and back
  when the window narrows; the Tabs / Poster setting applies on phones. The
  home screen's greeting, counts and "Swrled to you" strip (`views/homePage.js`,
  the `.homeExtra` elements) show on desktop, and on phones with the Cards home
  layout. The desktop CSS is one `@media (min-width: 1025px)` block
  at the end of `www/css/index.css`.
- **Phone home layout (Settings → "Home screen on your phone"):** Cards (the
  default since 3.23.0: the phone version of the desktop home, with a
  greeting, a 2x2 grid of tiles with count pills `.sectionPills`, "Swrled to
  you", and a bottom bar) or Tiles (the original four full-height buttons). Stored as `homeLayout` on
  the profile (`model/homeLayout.js`, `actions/setHomeLayout.js`, read in
  `listeners/listEntries.js` with `getHomeLayout` / `addHomeLayoutListener`);
  `components/homeLayout.js` puts it on `<body data-home-layout>` (and keeps a
  per-device `localStorage` hint so a reload does not flash the wrong layout). The
  bottom bar `#phoneNav` (`components/phoneNav.js`: Home, Watch, Read,
  Listen, Play, Eat; search is the round button above it, `components/quickAdd.js`) is the phone's sidebar: CSS shows it only under 1025px, with Cards, on
  `data-screen` home and list; `StateController._switchCategory` keeps the tab
  (Your list / Discover / Search) and search words when switching category.
  `StateController.openSearchEverything()` opens Search everything (category
  `ALL`) and focuses the box inside the tap, so the phone keyboard comes up; the
  home search box, the Tiles header's search button, the round search button
  and the sidebar's Search item use it. On Search everything the sidebar marks
  "search". The
  phone Cards CSS is a block at the very end of `www/css/index.css`.
- **Start-up:** `www/index.html` paints the launch splash (`#launchSplash`,
  the icon on white like the installed app's own splash) at once; `index.js`
  waits for `loginReady` (`firebase/login.js`), opens the deep-linked or home
  screen, then `hideLaunchSplash()` fades the splash away, so opening goes
  splash → target screen with nothing in between.
- `src/index.js` — on DOM ready → init Firebase → create the
  singleton `StateController` → set up login → show initial screen.

- **In progress** ("Watching", "Reading", "Listening", "Playing"): wording and
  ordering in `model/progress.js` (`progressWords(categoryID)`,
  `inProgressFirst`). Set from the swrl page toggle and the quick button on Your list cards
  (`addProgressButton` in `components/buttons.js`, which marks its container
  `data-progress-buttons="on"`; actions `markASwrlAsInProgress` /
  `unmarkASwrlAsInProgress`). Shown as the `.swrlProgress` badge on list and
  inbox cards (`addProgressBadge`), first on Your List, as the middle of Your
  list's Later / Watching / Done switch (`model/listStates.js`: `State.listState`,
  `inListState`; drawn by `showListStates` in `components/listToolbar.js`,
  carried by the filter sheet, the Your list tab and the bottom bar), on a swrler's "In progress" tab
  (`SWRLER_IN_PROGRESS`, query `inProgress == true`), on the home tiles
  ("3 on your list · 1 watching"), as "Carry on watching" in Pick for me, as
  its own group on the swrl page's friends card and in Friends' recent
  activity (`activityCaption`). Every place it appears is listed in
  `docs/user-journeys.md`.
  Marking done or removing from the list clears it (those actions write
  `inProgress: false`, and the buttons call `showInProgress`).
- **Swrl page toggles** (`.pageToggles`: Love, Watching, Mark as done, Dismiss,
  Share): a grid of equal columns. On phones each stacks its icon over its
  label and must `align-self: stretch` (the shared `.swrlButton` rule centres
  itself), or a two-line label makes its cell taller than the rest. On
  desktop they become pills in the header. A new toggle must be checked at
  360px with the longest label.

- **Shared UI helpers:** `components/headerColour.js` (`setHeaderColour`: every
  screen's `updateTitleBar` colours the phone header through it, so the title
  stays readable), `components/keyboard.js` (`makeKeyboardClickable`, the tabs'
  roles and the "Skip to content" link), `components/updateCheck.js` (see
  `swrl-build-deploy`, "New builds reach open apps").
- **Swrl page tabs** (phone, Tabs layout): Overview, Cast, Links, Notes (signed
  in only; the private comments card, `pageSection-notes`; a dot when I have
  notes, via `showPrivateComments`' count), Friends, from
  `tabsToShow` in `model/swrlPage.js`. Poster and desktop show every section.
- **Swrls inbox cards** (`components/recommendation.js`) are list cards: built
  from the `#swrl` template with `addDetailedParts` and the same buttons, plus
  the sender line, a "New" pill and a footer (date, Reply, Mark as read,
  Dismiss). On desktop `#recommendationList` is the list's two-column grid.

- **Start-up and live data:** the first screen opens from the saved copy
  (`firebase/bootCache.js`, `primeListEntries`) before Firebase answers; see
  `swrl-build-deploy`, "Opening instantly". `addListEntriesChangeListener`
  listeners get `{remote}`: true for changes from elsewhere (another device,
  the live list replacing the saved copy), false for taps here and the server
  confirming them. Your list redraws in place only on remote changes that
  change what it shows (`showList(..., {quiet: true})`).
- **Full-screen images:** `components/imageViewer.js` (`makeImageZoomable`,
  `showImageViewer`) with `model/imageSize.js` (`largeImage`, a sharper copy
  per source). Its popstate listener is added at import, before index.js's
  `window.onpopstate`, so back closes the viewer without navigating.

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
- `.swrlButton` sets `align-self: center`. Inside a grid or flex row that
  should line up (the page toggles), override it with `align-self: stretch`.
- The app only runs in a browser; there is no platform switch. Routing uses
  the History API (`screen.updateLocationHistory`, `window.onpopstate`).
