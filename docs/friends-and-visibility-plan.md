# Friends and list visibility — design and build plan

Status: built and tested against the emulators (Phases 1 to 5 and account
deletion are on branch `ccr-22cb35e7-7ggqaa`); awaiting rollout. Nothing has
been run against the live project. The owner's steps are in "Rollout" below.
This file is the single spec for the work. If you change a decision, change it
here in the same commit.

## Goal

- Users can add friends (request and accept), see their friends list, and open
  a friend to see their swrls.
- Each user chooses a default visibility for their swrls: **private**,
  **friends** or **public**. The default for everyone, existing and new, is
  **friends**.
- A user can override the visibility of a single swrl.
- The counts shown on a swrl (on how many lists, loved, recommended) stay.
- Privacy is real: enforced by Firestore security rules, not only by the UI.

## Why the data model has to change

Today a `swrls/{swrlID}` doc is shared by everyone and holds arrays of uids
(`later`, `done`, `deleted`, `loved`, `isRecommended`). Firestore rules work
per document, so anyone who can read a swrl can read who has it. Per-user
privacy is impossible while membership lives on the shared doc.

So membership moves to a doc per user per swrl, and the shared doc keeps only
anonymous counts.

## Data model

### `swrls/{swrlID}` (shared, no uids)

```
{ type, category, swrlID, details, added, updated,
  recommendations: string[],        // recommendation doc ids (no uids), as today
  laterCount, doneCount, lovedCount // numbers, written ONLY by Cloud Functions
}
```

Legacy arrays `later`, `done`, `deleted`, `loved`, `isRecommended` are no
longer read or written by the client. They stay on old docs until the
migration script strips them. Stats fall back to the legacy array lengths when
a count field is missing, so counts look right before the migration runs.

### `swrlers/{uid}/listEntries/{swrlID}` (one user's state for one swrl)

The subcollection is called `listEntries`, not `swrls`, so that a collection
group query never mixes it with the top-level `swrls` collection.

```
{ swrlID, uid,
  type, category, details,     // denormalised copy, so a list renders from entries alone
  later: boolean, done: boolean, loved: boolean, deleted: boolean,
  added, updated,              // serverTimestamp()
  visibility: 'private' | 'friends' | 'public',   // the EFFECTIVE value
  visibilityOverride: boolean  // true when the user set it for this swrl
}
```

`visibility` is always stored as the effective value so a rule or query needs
one field. When a user changes their default, every entry with
`visibilityOverride == false` is rewritten (batched, 400 per batch).

Queries on entries use equality filters only (`later == true`,
`category == x`, `visibility in [...]`) and sort on the client, so they need
no composite indexes. Lists are already fetched whole and paged on the client.

### `swrlers/{uid}` (public profile)

```
{ uid, displayName, photoURL, lastLoginTime,
  defaultVisibility?: 'private' | 'friends' | 'public' }  // absent means 'friends'
```

Readable by any signed-in user (name and photo are needed everywhere). Never
holds email or other private data.

### Friends

- `friendRequests/{fromUid}_{toUid}`: `{ from, to, created, status: 'pending' | 'accepted' }`.
  Created by `from` with `status: 'pending'`. Readable by `from` and `to`.
  `to` may change `status` to `'accepted'` (nothing else). Either side may
  delete it (cancel or decline).
- `swrlers/{uid}/friends/{friendUid}`: `{ uid: friendUid, since }`. Written
  only by Cloud Functions. The owner may read and delete (unfriend).
- Cloud Function `friendRequestAccepted` (onUpdate of a request, status
  becomes `accepted`): writes both `friends` docs, deletes the request.
- Cloud Function `friendRemoved` (onDelete of a `friends` doc): deletes the
  mirror doc on the other side. Idempotent.
- Cloud Function `friendRequestNotification` (onCreate of a request): push
  notification to the receiver, same pattern as `recommendationNotification`.

### Counts

Cloud Function `listEntryCounts` (onWrite of
`swrlers/{uid}/listEntries/{swrlID}`): works out the change in `later`,
`done`, `loved` between before and after and applies
`FieldValue.increment` to `swrls/{swrlID}`. Pure delta logic lives in
`functions/messages.js` (or a new pure module) with tests. Clients can never
write the count fields. The migration script can recount from scratch.

### "Recommended to you"

`isRecommended` on the shared doc exposed who was recommended what. It goes.
The filter and the full-page marker use the inbox cache in
`src/listeners/recommendations.js` instead (a swrl is recommended to me when
an inbox recommendation has its `swrlID`). The `recommendations` id array on
the shared doc stays and still gives the recommended count.

## Who can see what

| Viewer | Sees entries with visibility |
| --- | --- |
| The owner | all |
| An accepted friend | `public`, `friends` |
| Any other signed-in user | `public` |
| Not signed in / anonymous | `public` |

A non-owner's query must carry the matching constraint
(`visibility == 'public'` or `visibility in ['public', 'friends']`), because
rules are not filters.

The "Swrlers" card on the swrl full page shows: me (if it is on my lists),
my friends who have it (one `getDoc` per friend on their entry, denied reads
ignored), and everyone who has it publicly (a collection group query on
`listEntries` where `swrlID == x` and `visibility == 'public'`). The counts
stay anonymous and include private entries.

Discover keeps reading the shared `swrls` collection. A swrl that is only on
private lists can still appear there, with counts but no names.

## Security rules and indexes

`firestore.rules` and `firestore.indexes.json` live at the repo root. They are
**not** deployed by CI. The owner reviews them against the rules in the
Firebase console and applies them by hand (see Rollout). The rules must cover
every collection the app uses, including the existing private comments rule
from the `swrl-firebase` skill, `recommendations` (readable by `from` and
`to` only), `messagingtokens` and `savedsearches` (owner only).

## Client structure (follow `swrl-architecture`)

- `src/constants/Visibility.js`: the three values, labels, `visibilityFromId`.
- `src/model/listEntry.js`: `ListEntry` with `fromFirestore`, plus pure
  helpers (effective visibility, what a viewer may query). Unit tested.
- `src/constants/Collection.js`: `listEntriesPath(uid)`, `friendsPath(uid)`,
  `FRIENDREQUESTS`, `friendRequestId(from, to)`.
- `src/listeners/listEntries.js`: `onSnapshot` of my own entries into a cache
  keyed by swrlID. Buttons, filters and lists read "is this on my list / done
  / loved / deleted" from this cache, never from the shared doc.
- `src/listeners/friends.js`: my friends, incoming requests, sent requests.
- `src/actions/*`: every list action writes my entry (and, where it creates or
  refreshes the swrl, the shared doc's details in the same batch). New actions:
  `setDefaultVisibility`, `setSwrlVisibility`, `sendFriendRequest`,
  `acceptFriendRequest`, `declineFriendRequest`, `cancelFriendRequest`,
  `removeFriend`.
- Screens/views: Friends (`/friends`), Settings (`/settings`); both reached
  from the sidebar menu when signed in. `server.js` `appRoutes` gains both.
- Friend search is by display name only. Never match or show email.

## Build phases

Each phase ends with `npm test` and `cd functions && npm test` passing and
`npm run build` succeeding, then one commit.

1. **Foundation, no UI change.** Visibility constant, `ListEntry` model,
   collection paths, `firestore.rules`, `firestore.indexes.json`, Cloud
   Functions (`listEntryCounts`, `friendRequestAccepted`, `friendRemoved`,
   `friendRequestNotification`) with pure logic tested, migration script
   `scripts/migrate-list-entries.js`.
2. **Client reads and writes entries.** Own-entries listener, all list
   actions, Your List, Discover, buttons, stats, filters, the swrl full page
   and search results stop using the uid arrays.
3. **Friends.** Listeners, actions, Friends screen, add-friend by name, friend
   requests, menu entry, route, "Add friend" on a swrler's page.
4. **Visibility.** Settings screen with the default, per-swrl override on the
   full page, swrler list honouring the viewer's relationship, the Swrlers
   card honouring visibility.
5. **Docs and verification.** Docs and skills brought up to date, the
   Rollout checklist, a migration-to-app integration test on legacy-shaped data
   and a regression sweep, all against the emulators (see "Phase 5 decisions").

## Migration script

`scripts/migrate-list-entries.js` (admin SDK, resolved from `functions/` like
`scripts/remove-swrler-emails.js`; needs Node 22 and
`gcloud auth application-default login`; `FIRESTORE_EMULATOR_HOST` makes it
use an emulator instead, and must NOT be set for the real run):

- default: for every swrl doc and every uid in its legacy `later`, `done`,
  `deleted` and `loved` arrays, create the user's entry if it does not exist
  yet (`create()`, so an existing entry is never overwritten), with the user's
  `defaultVisibility` or `friends`, `added` / `updated` copied from the shared
  doc; then recount `laterCount` / `doneCount` / `lovedCount` for every swrl
  from the entries. A uid with no `swrlers` profile (an account deleted before
  account deletion existed) gets no entry: it would be an orphan under a
  profile that does not exist, invisible, never cleaned up and still counted.
  The script prints which uids it skipped. Such a user's data is simply not
  carried over, and the counts cover real users only.
- `--dry-run`: report only (combine with any mode).
- `--recount`: only redo the counts, from the entries.
- `--strip-arrays`: remove the legacy arrays from every swrl doc (docs without
  them are left alone). Run this last, once no old client is left. Irreversible.

## Rollout (owner)

Nothing here has been run against the live project. Everything below was
rehearsed on the emulators (Phase 5), except the three things the emulators
cannot show: the deploy itself (the first Auth-triggered function in this
project), the console steps (rules, index) and how the real data looks.

Prerequisites, once:

- Node 22 (`node --version`) and `(cd functions && npm ci)` in the repo.
- `gcloud auth application-default login` with an account that can read and
  write Firestore in project `swrl-1118`. Make sure `FIRESTORE_EMULATOR_HOST` is
  not set in that shell (the script would write to an emulator, or fail).
- Recommended: a Firestore export before step 2 and again before step 9, e.g.
  `gcloud firestore export gs://<a-bucket-you-own>/swrl-backup-$(date +%F) --project swrl-1118`.

Checklist:

1. Review `firestore.rules` against the rules now in the Firebase console
   (Firestore Database, Rules). The repo file is the intended full set (every
   collection the app uses, including the private comments rule). Do not apply
   it yet. If `scripts/remove-swrler-emails.js` has never been run, run it now
   (`./scripts/remove-swrler-emails.js --dry-run`, then for real): profiles are
   readable by every signed-in user.
2. Dry run: `./scripts/migrate-list-entries.js --dry-run`. Read the numbers
   (swrls, entries to create) and the line about skipped uids.
3. For real: `./scripts/migrate-list-entries.js`. The new functions do not
   exist yet, so the counts it writes are final. It is safe to re-run.
4. Merge to `master` and wait for the deploy (app and functions) to finish
   in GitHub Actions. Then do steps 5 and 6 straight away: the live console
   rules were not visible when this was written, and if they do not allow
   writes under `swrlers/{uid}/listEntries` or `friendRequests`, the new app's
   list and friend actions fail until step 6.
5. In the Firebase console, Functions: check that `listEntryCounts`,
   `friendRequestAccepted`, `friendRemoved`, `friendRequestNotification` and
   `userDeleted` are listed next to `userActivityNotification` and
   `recommendationNotification`. `userDeleted` is an Authentication trigger
   (event: user deleted); it could not be tried without a real deploy. If the
   deploy failed on it, stop here and read the log before going on.
6. Apply the rules: Firestore Database, Rules; replace the editor contents with
   the whole of `firestore.rules`; Publish. Do this after step 5, not before:
   from this moment the old app code can no longer write.
7. Create the collection-group index: Firestore Database, Indexes, the "Single
   field" tab, "Add exemption", twice:
   - Collection ID `listEntries`, field path `swrlID`;
   - Collection ID `listEntries`, field path `visibility`.
   For each: query scope "Collection" with Ascending and Descending on (the
   defaults), and "Collection group" with Ascending on (this is the part the
   app needs). Save, and wait until both show Enabled. These are the entries of
   `firestore.indexes.json`; do not deploy that file with tooling that deletes
   indexes missing from it. Until it is enabled, the "Swrlers" card on a swrl's
   page cannot list people with a public entry (the browser console shows a
   failed-precondition error with a link that creates the same index); my own
   and my friends' entries still show.
8. Pick up what happened since step 3, then fix the counts:
   `./scripts/migrate-list-entries.js`, wait a minute, then
   `./scripts/migrate-list-entries.js --recount`. (The `listEntryCounts`
   function is live now and reacts to every entry the script creates; whether
   it lands before or after the script's own count varies, so the counts can be
   doubled for a moment. The recount after the wait makes them exact; a
   second `--recount` should say "Updated counts on 0".) Changes an old client
   made, between steps 3 and 6, to a swrl that was already migrated are not
   carried over: the entry says what it said at step 3.
9. A week or so later, when old tabs and installed apps have refreshed:
   `./scripts/migrate-list-entries.js --strip-arrays --dry-run`, then for real
   (after an export). From then on the swrl docs hold no uids at all.
10. Read `www/privacy_policy.html`. It was rewritten to describe what is stored,
    who can see it, the visibility setting and account deletion. Check it says
    what you want, in particular the contact route (a GitHub issue).
11. Smoke test with a real account: Your List and Discover show the right swrls
    and counts; Settings changes the default; send a friend request between
    two accounts; check a stranger's page shows only public swrls.

What users see:

- Before step 3 nothing changes for them. If the migration were skipped and the
  new app deployed anyway, a user would see an empty Your List (their lists are
  in the legacy arrays, and the new app reads entries only), Discover would
  list everything including swrls they already have, shown as not added, with
  counts from the legacy array lengths and no errors. Adding a swrl would then
  make the shown count of that swrl drop to the shared counter's own total
  (e.g. 3 shown, 1 after) until a migration recount. This is why the migration
  runs first and a second time after the deploy.
- A browser or installed app still running the old code (a tab left open, an
  app not reopened since the deploy; the service worker is network-first, so
  the next page load fetches the new code) behaves as follows. Until step 6 it
  keeps writing the legacy arrays: those writes are not seen by new clients
  (carried over only for entries missing at step 8). After step 6 its writes to
  `swrls` are refused (permission-denied; the buttons may flip and the change is
  not saved). Its reads keep working but the arrays are frozen, so its lists
  and counts go stale; after step 9 its lists and counts are empty. It is fixed
  by reloading the page. How long that takes depends on the user; that is the
  reason for waiting a week before step 9. (The old client's exact behaviour on
  a refused write was not run here; the refusal itself was.)
- Rolling back: until step 9 the old code still works on the legacy arrays
  (revert the deploy and republish the old rules); anything done in the new app
  since is only in the entries. After step 9 there is no way back except the
  export.

Notes:

- `firestore.indexes.json` only holds the indexes the NEW queries need.
- `firestore.rules` is tested against the emulator with `npm run test:rules`
  (needs Java; `test-rules/`, not part of `npm test` and not run by CI).
- Neither `firestore.rules` nor the indexes are deployed by CI (the deploy job
  only runs `firebase deploy --only functions`); steps 6 and 7 are by hand.
- The account-deletion function `userDeleted` is deployed with step 4 like the
  others; see "Account deletion".

## Not in scope

- Limiting recommendations to friends (recommend still lists all swrlers).
- Blocking users.

## Phase 1 decisions (recorded while building)

- `swrlers/{uid}` is readable by any signed-in user, anonymous included
  (`request.auth != null`), not by unauthenticated requests. The app signs
  every visitor in anonymously (`src/firebase/login.js`), and the Firestore
  SDK waits for that, so deep links to `/swrler/:id` and the full page work.
  If anonymous sign-in ever fails, the profile reads fail too.
- Clients cannot delete `swrlers/{uid}`; `create`/`update` only, with no
  `email`, a matching `uid` if present, and a valid `defaultVisibility`.
- A friend request create is also refused when the two are already friends,
  must carry exactly `from, to, created, status`, and `created` must be the
  server time.
- `recommendations`: readable by `from` and members of `to`. The app's two
  listeners (`to array-contains me`, `from == me`) fit that. The full page and
  inbox read only those caches, so nothing needed loosening. A receiver may
  update only `read` / `dismissed`, and only add or remove their own uid.
  Clients cannot delete recommendations (none do today).
- `messagingtokens` (doc id = token): any signed-in user may write a doc with
  their own uid (a device handed to another user takes it over, as today);
  only the current owner reads or deletes. `savedsearches`: owner only.
- Any signed-in user, anonymous included, may write `swrls` details (as
  spec'd). The legacy uid arrays and the counts are refused.
- Pure Cloud Function logic is in `functions/listEntries.js` (counts, accept
  transition, friend docs, legacy swrl to entries); push message in
  `functions/messages.js`. No change to `deploy.yml` or terraform is needed:
  the deploy runs `firebase deploy --only functions`, which picks up every
  export of `functions/index.js`.
- The migration's recount counts `later`/`done`/`loved` flags from entries,
  including entries flagged `deleted`, exactly like `listEntryCounts`.

## Phase 2 decisions (recorded while building)

- `src/listeners/listEntries.js` holds my entries in an in-memory cache and
  exposes `getListEntry`, `getAllListEntries`, `whenListEntriesReady()` /
  `isListEntriesReady()`, `getDefaultVisibility()` and
  `setCurrentDefaultVisibility()` (Phase 4 calls the latter when the setting
  changes). It does not notify views on change by itself: buttons toggle
  optimistically as before. (Phase 4 added `addListEntriesChangeListener` for the
  one control that needs to follow my entry live.) The "ready" promise
  covers the first snapshot AND the read of `defaultVisibility`, so an action
  never stamps a new entry with a wrong default. It resolves at once when
  nobody is signed in.
- Deviation (fail closed): if reading `swrlers/{uid}.defaultVisibility` fails,
  new entries are `private` until the next login, never `friends`.
- Actions share `src/actions/writeListEntry.js` (one `writeBatch`: my entry +
  the shared doc's details); the pure data builders are in
  `src/model/listEntryWrite.js`. Every action now also sets `updated` on the
  entry (the old `deleteSwrl` / `unloveASwrl` did not touch it on the shared
  doc; the shared doc keeps the old behaviour).
- `Swrl` lost its uid arrays: `later/done/deleted/loved/isRecommended` are gone
  and it carries `laterCount`, `doneCount`, `lovedCount` instead, taken from
  the count fields or, per field when missing, from the legacy array length
  (`countOrLegacy`, used only there). Constructor order changed to
  `(type, category, swrlID, details, added, updated, recommendations, laterCount, doneCount, lovedCount)`.
- Counts are not adjusted locally after an action: the old UI never bumped the
  number either, it only toggled the buttons.
- Your List is built from the cache (`category`, `later`, optional type), sorted
  on the client (`sortListEntries`; titles compare case-insensitively, unlike
  the old Firestore order). `renderSwrl` fetches `swrls/{id}` per card for the
  counts (also for the swrler list and search/recommend) and falls back to the
  entry's own details if the doc is missing or unreadable, so cards appear
  immediately and fill in as the reads arrive.
- Swrler list: query on that user's `listEntries` with `visibility in [...]`
  from `visibilitiesViewerMayQuery(viewer, owner, false)` (nothing extra for
  the owner), sorted on the client.
- Swrlers card: `getEntriesForSwrl` in `src/firebase/swrlEntries.js` merges
  `swrlersCardSources` (`myEntrySource`, `publicEntriesSource`), one entry per
  uid, first source wins. Phase 4 adds a friends source to that array.
- "Recommended to you" and the full page marker use `isRecommendedToMe`
  (`src/listeners/recommendations.js`, pure part `inboxHasSwrl`). A dismissed
  recommendation still counts, as `isRecommended` never cleared either.
- `firebase.emulators.json` (used with `--config`) points the Firestore
  emulator at `firestore.rules`. `firebase.json` is untouched. The deploy job
  runs `firebase deploy --only functions`, so a `firestore` section there would
  not have been deployed either, but the separate file keeps it impossible.

## Phase 3 decisions (recorded while building)

- `src/listeners/friends.js` runs three `onSnapshot`s (my `friends`, requests
  with `to == me`, requests with `from == me`) for a signed-in, non-anonymous
  user, idempotent per uid, wired into `login.js` next to the others. Getters:
  `isFriend`, `getFriends`, `getIncomingRequests`, `getSentRequests`,
  `getRelationshipTo` (pure part `relationshipTo` in `src/model/friendRequest.js`),
  `whenFriendsReady()` (first snapshot of all three, resolves at once for
  anonymous users or after giving up). Views subscribe with
  `addFriendsChangeListener`. The badge (count of pending requests to me) is
  updated by the listener itself, like the inbox count: a pill on the Friends
  menu item and a dot on the hamburger button.
- Actions take `(uid, firestore)` like the others. `sendFriendRequest` accepts
  their request instead when the incoming cache holds one; it cannot read the
  other direction's doc to check (a read of a missing request is refused by the
  rules, `resource` being null), so the cache is the only check. The rules
  alone would allow a second request in the other direction; the UI never
  offers "Add friend" in that case, it offers "Accept".
- Accepting is completed by a Cloud Function. After pressing Accept the row
  says "Adding..." for 5 seconds, then "Accepted, finishing up..." for as
  long as the request stays accepted (no spinner). Once the friends doc exists
  the accepted request is hidden. Accepted requests do not count in the badge.
- The add-a-friend search loads all `swrlers` once per visit (as `recommend.js`
  does) and filters on the client by display name only: at least 2 characters,
  me excluded, at most 20 shown (with a note when there are more).
- The friendship control (`src/components/friendControl.js`) is shared by the
  search results and the swrler page. On the swrler page it is a sticky bar at
  the top of the list (hidden on my own page and for anonymous viewers). The
  swrler list waits for `whenFriendsReady()` and reloads when the viewer
  becomes (or stops being) a friend of that swrler.
- The Swrlers card: `friendsEntriesSource` does one `getDoc` per friend. The
  rules answer permission-denied both for a private entry and for a missing
  one, so permission-denied is swallowed silently; other errors are logged.
  Order is me, friends, public.
- `/friends` is a route in `server.js`, `www/sw.js` (app-shell routes) and
  `src/index.js` (anonymous visitors land on the home page). The push
  notification link `${SITE_URL}/friends` lands there.
- No change to `firestore.rules`. `firebase.emulators.json` now also starts the
  Functions emulator (port 5001); it needs `functions/.secret.local` with
  `PUSHOVER_TOKEN` / `PUSHOVER_USER` placeholders (git-ignored), and in
  sandboxes with an HTTP proxy the emulators must run without the proxy
  variables (`env -u HTTPS_PROXY -u https_proxy -u JAVA_TOOL_OPTIONS ...`), or the
  Firestore trigger registration fails.
- For Phase 4: pass `isFriend(ownerUid)` from the friends listener to
  `ListEntry.isVisibleTo` / `visibilitiesViewerMayQuery`; the swrler list
  already does. Friend rows and the control reuse `.friendRow`, `.friendButton`.

## Phase 4 decisions (recorded while building)

- Settings is `/settings` (`src/screens/settingsScreen.js`, `src/views/settings.js`),
  wired like Friends: sidebar item `#settingsMenu` (real accounts only, shown and
  hidden in `login.js`), `server.js` `appRoutes`, `www/sw.js` route list,
  `src/index.js` deep link (anonymous visitors land on home), `StateController`.
  If the view is shown while signed out (history navigation), it says "Log in to
  see your settings." and nothing else. The radios save at once, with a toaster on
  success; on failure the radio goes back to the stored default and an error
  toaster shows. The radios are disabled while saving.
- `setDefaultVisibility(visibility, firestore)` write order (`writeOrder` in
  `src/model/visibilitySettings.js`, unit tested):
  - **more private (or the same)**: rewrite the entries first (batches of 400,
    `update` of `visibility` only, so `updated` and the list order are untouched),
    then the profile. A failure leaves some entries more private than the stored
    default says, never less.
  - **less private**: write the profile first, then the entries. A failure leaves
    entries as private as they were, never more visible than the new setting.
  - The in-memory default (`setCurrentDefaultVisibility`) changes only when
    everything was written. Entries to rewrite are the ones with
    `visibilityOverride == false` AND not yet at the target, taken from the
    own-entries cache, so choosing the same value again after a failure finishes
    the job and an already-complete run writes nothing.
- `setSwrlVisibility(swrlID, visibility | 'default', firestore)`: `updateDoc` on
  my entry with `{visibility, visibilityOverride: true}` or, for "default",
  `{visibility: <my default>, visibilityOverride: false}`. `updated` is never
  written. It needs the entry to exist, so an update of a missing entry fails
  instead of creating a stub the rules would refuse.
- The per-swrl control ("Visible to:", a `<select>` with Default (X) / Private /
  Friends / Public) sits right under the swrl's buttons on the full page, above
  the cards. It appears only while my entry is on a list (later, done or loved) and
  follows my entry live. To make that possible `src/listeners/listEntries.js` got
  `addListEntriesChangeListener` (a plain subscriber set called after each
  snapshot, local writes included). This replaces the Phase 2 remark that the
  listener notifies nobody. It is used only by this control.
- Swrler page empty states (`emptySwrlerMessage`): own page unchanged ("No Swrls to
  see here :("); a friend sees "Nothing here yet."; anyone else (stranger or
  anonymous) sees "{Name} only shares swrls with friends, or has nothing public
  here." The friendship bar stays. Nothing tells a stranger whether hidden entries
  exist.
- No change to `firestore.rules`. `test-rules` gained one test for the owner's
  batch update of `visibility` / `visibilityOverride` (and a bad value refusing the
  whole batch).
- Leak check of the client (`collectionGroup`, `listEntriesPath`, `getDocs(`):
  the only other-user reads of entries are the swrler list (query carries
  `visibility in visibilitiesViewerMayQuery(...)`), the Swrlers card (a `getDoc`
  per friend, denied reads swallowed; a collection group query constrained to
  `visibility == 'public'`) and my own listener. `getDocs` on `swrlers` (the
  recommend and friend searches) read the public profile (name, photo,
  `defaultVisibility`) which the rules allow to any signed-in user by design.
  `getDocs` on `swrls` reads the shared doc (details and anonymous counts).

## Account deletion (Phase 4 addition)

- **Cloud Function `userDeleted`**: a 1st gen Auth trigger
  (`functions.auth.user().onDelete`), so the same clean-up runs for a deletion from
  the app and one from the Firebase console. It runs `deleteUserData` (admin SDK,
  `functions/deleteUserData.js`; pure planning in `functions/accountDeletion.js`,
  tested in `functions/test/accountDeletion.test.js`) for the uid:
  - explicit delete of each friend's mirror doc `swrlers/{friend}/friends/{uid}`
    (found from the user's own friends docs; `friendRemoved` would do it too)
  - `friendRequests` with `from == uid` or `to == uid`
  - `messagingtokens` and `savedsearches` with `uid == uid`
  - `recommendations` sent by the user: deleted, id removed from
    `swrls/{id}.recommendations` (only swrls that still exist); recommendations
    received: the uid leaves `to`, and `read` / `dismissed` if present; when `to`
    becomes empty the doc is deleted and its id removed from the swrl
  - legacy arrays: `arrayRemove(uid)` from `later`, `done`, `deleted`, `loved`,
    `isRecommended` (five `array-contains` queries, one update per swrl doc)
  - last, `db.recursiveDelete(swrlers/{uid})`: the profile, `listEntries`
    (`listEntryCounts` brings the shared counts down), `friends`
    (`friendRemoved`, a no-op by then) and `privateComments`
  - Writes go in batches of at most 400, a one-line summary is logged, and it is
    safe to re-run. `failurePolicy: true` makes Cloud Functions retry a failed run,
    which is safe for that reason. The existing `userActivityNotification` fires on
    the profile delete ("was deleted"), as intended.
- **Deploy**: nothing extra in `deploy.yml` or terraform: `firebase deploy --only
  functions` deploys every export, the deploy account already has
  `cloudfunctions.admin`, `firebase.admin` and `serviceusage.serviceUsageAdmin`, and
  a non-blocking Auth trigger needs no Identity Platform upgrade. Not verified
  against the live project (no deploy was possible); see Rollout.
- **Client**: Settings has a "Delete my account" section at the bottom (red, set
  apart). It says what goes (lists, private notes, friends and requests, saved
  searches, recommendations you sent) and that it cannot be undone. The button
  opens an inline confirmation ("Are you sure?" with "Yes, delete everything" and
  Cancel). Chosen over typing DELETE because it is lighter on a phone and, unlike
  `window.confirm` (used for removing a friend), it is a styled panel that can be
  shown and tested; it still needs a second, explicit tap.
- `src/actions/deleteAccount.js`: stops my listeners (`pauseUserListeners` in
  `login.js`: once the account is gone they would only log permission errors),
  `deleteUser(auth.currentUser)`; on `auth/requires-recent-login` it runs
  `reauthenticateWithPopup(user, new GoogleAuthProvider())` (the provider
  `login()` uses) and retries once; if the popup is closed the action resolves
  `false` (nothing deleted, listeners restarted with `resumeUserListeners`, toaster
  "Your account was not deleted"); other errors restart the listeners and show an
  error toaster. On success it calls `handleLogout()` (exported from `login.js`;
  the auth state change does the same and signs in anonymously), the view goes to
  the home screen, empties the back stack and shows "Your account was deleted".
  Classifying the auth errors is the pure `classifyDeleteError`
  (`src/model/accountDeletion.js`, tested).
- The client deletes nothing in Firestore, so nothing is half-deleted if the tab
  closes; the rules are unchanged. `updateSwrlerDetails` runs on login only
  (`handleLoginSuccess`), and re-authenticating does not trigger it (same uid), so
  a deleted profile is not recreated; verified (profile still absent seconds later).
- Known limits: other devices signed in as the deleted user keep a valid ID token
  for up to an hour and could still write; the Firestore offline cache in that
  browser is not wiped (logout does not wipe it either); the privacy policy page
  (`www/privacy_policy.html`) was rewritten afterwards and now describes
  deletion.

## Phase 5 decisions and findings (integration test on the emulators)

Done on the Auth, Firestore (with `firestore.rules`) and Functions emulators
with the built app and Playwright, never against the live project.

- **Migration on legacy-shaped data.** Real Auth users and legacy `swrlers`
  profiles (no `defaultVisibility`, one with a leftover `email`) and 15 legacy
  swrl docs (uid arrays, mixed categories and types, spread-out `added` /
  `updated`, a swrl only deleted by one user, a loved-but-not-on-list one, an
  empty `later`, one with no arrays, one with only a deleted user's uid) were
  migrated by `scripts/migrate-list-entries.js`. Every expected entry existed
  with the right booleans, `added` / `updated` copied, `visibility: 'friends'`,
  `visibilityOverride: false`, `uid` and `swrlID`; the counts equalled the true
  totals after the recount.
- **Double count confirmed, and not deterministic.** With the functions
  running, the counts straight after the first run were exactly double on every
  swrl with entries (e.g. 6/0/2 instead of 3/0/1) and stayed so until
  `--recount`, which fixed them. On a second, tiny run (2 entries) the function
  happened to land before the script's own count and nothing was doubled. So the
  recount after a wait is always required when the functions are live.
- **Bug found and fixed: a uid with no profile.** The first run created entries
  for the deleted user under `swrlers/{uid}/listEntries` although
  `swrlers/{uid}` did not exist: orphans nobody can read, no function ever
  cleans up, still counted in the totals. The script now skips such uids and
  says so (`splitByProfile` in `functions/listEntries.js`, tested).
- **Entries are never overwritten, counts stay right.** After the app changed
  some entries (add, done, love, remove, dismiss) a default re-run created 0
  entries, left every changed entry as it was and the counts, from the
  entries, were right before and after the recount. A swrl written with legacy
  arrays after the first run was picked up by the next run.
- **`--strip-arrays`** removed the arrays from every doc that had them (15 of
  16: one never had any), a second run found nothing, and the default run on
  the stripped docs did nothing and did not crash. The app (Your List, Discover,
  counts from the count fields, full page state, the "Recommended to you"
  filter) kept working.
- **App on the migrated data.** Your List per category matched the legacy
  `later` arrays in all three sort orders; done and loved were right on cards
  and the full page; a swrl the user had deleted was absent from Discover;
  "Recommended to you" worked from the legacy `recommendations` doc; a
  non-friend saw nothing and the friends-only wording; after the two became
  friends through the UI the friend saw all three tabs, and the Swrlers card
  named the friend. Counts moved by exactly one per action through the function.
- **Old client refused, new client accepted.** A signed-in `setDoc` merge on
  `swrls/{id}` with `later: arrayUnion(uid)` (or `loved`, or `laterCount`) is
  refused with permission-denied; the new client's batch (my entry plus the
  shared doc's details) succeeds.
- **Unmigrated data in the app (the window if the migration were skipped).**
  Your List empty; Discover shows every swrl including ones the user has,
  not marked as added, with counts from the legacy array lengths; no errors.
  Acting on such a swrl makes its shown count drop to the counter's own total
  (3 shown, 1 after) until a recount.
- **Login alert fix.** `userActivityText` (`functions/messages.js`) now returns
  the login text for an update only when `lastLoginTime` changed (compared with
  `isEqual` or milliseconds); a create still counts as a login, a delete gives
  the deleted text, the owner is still skipped. The default-visibility change
  (which writes the profile) no longer sends a "has just logged in" alert.
- **Navigation findings.** The hamburger menu only exists on the home screen,
  so Friends and Settings are reached from there; back (the arrow or the
  browser) returns home, and forward works. A swrler page reached from the
  Friends list goes back to Friends.
- **Left as is.** The 32px `#menuSwipeable` strip at the left edge of the page
  (older code) sits over the left edge of the poster on list cards, so a tap
  exactly there does not open the swrl (tapping the title or elsewhere does).
