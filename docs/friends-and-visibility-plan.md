# Friends and list visibility — design and build plan

Status: in progress on branch `ccr-22cb35e7-7ggqaa`. This file is the single
spec for the work. If you change a decision while building, change it here in
the same commit.

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
5. **Docs and verification.** Update `CLAUDE.md` source map if needed, the
   `swrl-firebase` and `swrl-architecture` skills, this file's Rollout
   section; run everything; exercise against the emulators if Java is
   available.

## Migration script

`scripts/migrate-list-entries.js` (admin SDK, resolved from `functions/` like
`scripts/remove-swrler-emails.js`; needs Node 22 and
`gcloud auth application-default login`):

- default: for every swrl doc and every uid in its legacy arrays, create the
  user's entry if it does not exist yet (never overwrite an existing entry),
  with the user's `defaultVisibility` or `friends`; then recount
  `laterCount` / `doneCount` / `lovedCount` for every swrl from the entries.
- `--dry-run`: report only.
- `--recount`: only redo the counts.
- `--strip-arrays`: remove the legacy arrays from every swrl doc. Run this
  last, once no old client is left.

## Rollout (owner)

1. Run `./scripts/migrate-list-entries.js --dry-run`, then for real.
2. Merge to `master`; wait for the deploy (app and functions).
3. Apply `firestore.rules` and the indexes in the Firebase console.
4. Run `./scripts/migrate-list-entries.js` again to pick up anything added
   between steps 1 and 2. Changes old clients made to swrls that were already
   migrated in that window are not carried over.
5. A week or so later: `./scripts/migrate-list-entries.js --strip-arrays`.

Notes:

- `firestore.indexes.json` only holds the indexes the NEW queries need (the
  `listEntries` collection-group queries on `swrlID` and `visibility`). The
  indexes the legacy queries already have in the console are not reproduced
  here, so do not deploy it with `--force`-style tooling that deletes indexes
  missing from the file; add its entries in the console by hand.
- The `listEntryCounts` function reacts to every entry the migration script
  creates, asynchronously. Step 1 runs before the functions exist, so the
  script's own recount is final. On the second run (step 4) the function is
  live: after the script finishes, wait a minute and run
  `./scripts/migrate-list-entries.js --recount` once more, so late
  increments cannot leave the counts doubled.
- `firestore.rules` is tested against the emulator with `npm run test:rules`
  (needs Java; `test-rules/`, not part of `npm test`).

Browsers still running the old cached app keep writing the legacy arrays
until they refresh; once the rules are applied those writes are refused.

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
