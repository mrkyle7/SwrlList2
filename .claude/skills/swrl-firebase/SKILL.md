---
name: swrl-firebase
description: Use when touching Firestore, Firebase Auth, Cloud Messaging, or Cloud Functions. Covers the collection shapes, the modular API conventions, the emulators, and how auth / messaging / functions are wired up.
---

# Swrl Firebase layer

## SDK - modular API only

```js
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const snapshot = await getDoc(doc(firestore, Collection.SWRLS, swrlID));
if (snapshot.exists()) { ... }          // exists() is a method
await setDoc(doc(firestore, Collection.SWRLS, swrlID), data, { merge: true }); // details only: see the writing rule
```

Never import `firebase/compat/*`. The `Firestore` instance is created once in
`src/firebase/init.js` and passed down as `firestore`; pass it as the first
argument to `collection()` / `doc()`.

Watch for local variables named `doc` or `query` (e.g. `snapshot.forEach(doc => ...)`):
they shadow the imported functions. Name them `docSnapshot` etc.

In JSDoc, type things as `import('firebase/firestore').Firestore`,
`import('firebase/auth').User`, and so on.

`src/firebase/init.js` initialises the app and Firestore with a persistent,
multi-tab, unlimited-size local cache (`persistentLocalCache`). The client
config lives in `src/firebase/config.js`, shared with the messaging service
worker.

### Emulators

`npm run build:emulators` builds the app pointed at local emulators (Auth on
9099, Firestore on 8085, Functions on 5001; see `firebase.emulators.json`).
Start them, with the security rules and the Cloud Functions loaded, with:

```bash
npx --yes firebase-tools@15 emulators:start --config firebase.emulators.json \
    --only auth,firestore,functions --project swrl-1118
```

(needs Java, Node 22 and a git-ignored `functions/.secret.local` with placeholder
`PUSHOVER_TOKEN=x` / `PUSHOVER_USER=x`). Behind an HTTP proxy start it as
`env -u HTTPS_PROXY -u https_proxy -u JAVA_TOOL_OPTIONS ...`, or the Firestore
trigger registration fails. Then `npm start` (the app on 8080). This is the safe
way to exercise sign-in, rules, triggers and the migration; never test against
the live project. `firebase.json` has no `firestore` section on purpose; the
rules are only loaded through `firebase.emulators.json`.

Scripts and ad-hoc admin code reach the emulator with
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8085` (and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
for Auth). `scripts/migrate-list-entries.js` honours it; unset it for a real run.
The emulator's Auth popup (Playwright: `#add-account-button`, `#email-input`,
`#display-name-input`, `#sign-in`) links to an existing emulator user with the
same email, so you can pre-create users with the admin SDK and know their uids.

## Firestore collections (`src/constants/Collection.js`)

| Collection | Key | Purpose |
| --- | --- | --- |
| `swrls` | `swrlID` (deterministic, from the source, e.g. `TMDBMOVIE_123`) | The shared doc for an item: details and anonymous counts. **No uids and no per-user state.** |
| `swrlers` | user `uid` | Public profile: `uid`, `displayName`, `photoURL`, `lastLoginTime`, optional `defaultVisibility` (`private`/`friends`/`public`, absent means `friends`). Written by the owner on login. Readable by any signed-in user (anonymous included), so it must never hold private data such as email (login deletes a legacy `email` field; the rules refuse one). Never deleted by a client. |
| `swrlers/{uid}/listEntries/{swrlID}` | `swrlID` | One user's state for one swrl (below). The subcollection is not called `swrls` so a collection group query never mixes the two. |
| `swrlers/{uid}/friends/{friendUid}` | friend uid | `{ uid, since }`, mirrored on both sides. Written only by Cloud Functions; the owner reads and may delete (unfriend). |
| `swrlers/{uid}/privateComments/...` | | Private notes, see below. |
| `friendRequests` | `{fromUid}_{toUid}` | `{ from, to, created, status: 'pending' \| 'accepted' }`. `from` creates it pending; `to` may only set `accepted`; either may delete (cancel/decline). |
| `recommendations` | auto id | `from`, `to: string[]` (uids), `swrlID`, `message`, `created`, optional `read` / `dismissed` uid arrays. Readable by `from` and the receivers only. |
| `recommendations/{id}/replies/{replyID}` | auto id | `{ from, thread, text, created }`: the conversation about a recommendation. `thread` is a receiver's uid, so each receiver has a private thread with the sender. The sender reads all threads and may write to any receiver's (before they have replied); a receiver reads and writes only `thread == own uid` (their query must say so). Created by clients, never edited or deleted. |
| `swrlers/{uid}/unreadReplies/{recommendationID}` | recommendation id | `{ recommendationID, from, at }`: "you have an unread reply", written only by `recommendationReplyNotification`; the owner reads it and deletes it when opening the conversation. Drives the inbox badge and the always-show rule of the recommendations filters. |
| `messagingtokens` | the FCM token | `{ uid, token }` for push notifications; the owner only. |
| `savedsearches` | auto id | User-saved searches for discover; owner only. |

### Swrl shape (shared, see `src/model/swrl.js`)

```
{
  type, category, swrlID, details,
  added, updated,                       // serverTimestamp()
  recommendations: string[],            // recommendation doc ids (no uids)
  laterCount, doneCount, lovedCount     // numbers, written ONLY by Cloud Functions
}
```

Docs the migration has not reached may still carry the legacy uid arrays
(`later`, `done`, `deleted`, `loved`, `isRecommended`) and lack the counts;
`Swrl.fromFirestore` then falls back to the array lengths per missing count
field. The client never reads or writes the arrays and the rules refuse them
(and the count fields) from clients.

### List entry shape (`src/model/listEntry.js`)

```
swrlers/{uid}/listEntries/{swrlID}:
{ swrlID, uid, type, category, details,   // denormalised copy: a list renders from entries alone
  later, done, loved, deleted: boolean,
  added, updated,                         // serverTimestamp()
  visibility: 'private' | 'friends' | 'public',   // the EFFECTIVE value
  visibilityOverride: boolean }           // true when set for this swrl, false = follows the default
```

Who sees an entry: the owner all; an accepted friend `public` + `friends`;
any other signed-in user and anonymous visitors `public`. Rules are not
filters: a non-owner's query must carry the matching constraint
(`visibility == 'public'` or `visibility in ['public','friends']`; see
`visibilitiesViewerMayQuery`).

**Writing rule:** a list action writes MY entry and the shared doc's details in
one `writeBatch` (`src/actions/writeListEntry.js`): `set(..., { merge: true })`
on my entry with only the flags that change plus `serverTimestamp()` for
`added` / `updated`, and on `swrls/{id}` the details (`toPartialFireStoreData()`),
never counts or arrays. Never read-modify-write. Entries use plain booleans, so
there are no per-user `arrayUnion`s left on swrls. The only array fields clients
still write are not uid-membership: `recommendations` (recommendation doc ids) on
the shared swrl, and the `read` / `dismissed` uid arrays on a recommendation
(its receivers), which use `arrayUnion` / `arrayRemove` keyed by `swrlUser.uid`.
Anything else that must change an entry
(visibility) is an `update` of just those fields.

**Counts:** the `listEntryCounts` function applies the change in `later`,
`done`, `loved` between before and after of an entry write to the shared doc
with `FieldValue.increment`. Shown numbers: list = `laterCount + doneCount`,
loved = `lovedCount`, recommended = `recommendations.length`. Entries flagged
`deleted` keep counting whatever flags they have.

### Reading rule

Listeners (`src/listeners/*`) use `onSnapshot` and maintain an in-memory cache
(my entries keyed by `swrlID`; my friends and requests; the recommendation
inboxes). Views read from the cache synchronously; "is this on my list / done /
loved / deleted" always comes from `getListEntry` (my own entries), never from
the shared doc. Other users' data is read only through the paths the rules allow:
a swrler's page queries `listEntries` of that user with
`visibility in visibilitiesViewerMayQuery(viewer, owner, isFriend)`; the Swrlers
card on the full page merges my entry, one `getDoc` per friend (a denied read
means private or missing, and is ignored) and a collection group query
`swrlID == x && visibility == 'public'` (needs the collection-group index in
`firestore.indexes.json`). Beyond those, ad-hoc one-off `getDoc`/`getDocs` of
the shared `swrls` doc (for counts and details) and of the public `swrlers`
profiles (for the recommend and friend searches) are fine.

**Friend search is by display name only**; never match or show an email.

### Security rules and indexes (in the repo, applied by hand)

`firestore.rules` is the full rule set for every collection above; anything not
listed is denied. `firestore.indexes.json` holds only the two single-field
collection-group exemptions the new queries need (`listEntries.swrlID` and
`listEntries.visibility`). **Neither is deployed by CI** (the deploy job only
runs `firebase deploy --only functions`): the owner pastes the rules in the
console (Firestore, Rules) and adds the exemptions under Indexes, Single field
(steps are in `docs/friends-and-visibility-plan.md`, "Rollout"). Do not deploy
`firestore.indexes.json` with tooling that deletes indexes missing from it. After
changing rules run `npm run test:rules` (emulator, needs Java, not in `npm test`)
and add a test in `test-rules/firestore.rules.test.js`. Rules the owner relies on:
private comments owner-only, `swrls` counts and legacy arrays not writable by
clients, friends docs not writable by clients, `swrlers` never with an email.

### Shared links

`shares/{id}` holds `{ from, fromName, message, swrlID, created }`: something a
signed-in person shared outside the app (`src/actions/shareSwrl.js`). The link
is `/swrl/{swrlID}?from={id}`, so it still opens the swrl if the share can't be
read. Anyone holding the link may `get` that one doc, signed in or not; nobody
can list them. `server.js` reads it (and the swrl) over the Firestore REST API
with no credentials to fill in the link preview (og: tags) for WhatsApp and the
like; `FIRESTORE_EMULATOR_HOST` points it at the emulator. The share id is made
on the client without waiting for the network, because browsers only open the
share sheet straight after a tap. Account deletion removes a user's shares.

### Private labels

`swrlers/{uid}/labels/{swrlID}` holds `{ labels: string[], updated }`: one
user's private labels for one Swrl (`labelsPath()` in
`src/constants/Collection.js`; pure logic in `src/model/labels.js`). Owner-only
by rule, like private comments. They are NOT on the list entry, because friends
or everyone may read that. `src/listeners/labels.js` caches all of mine
(`getLabelsFor`, `getAllMyLabels`); `src/actions/setSwrlLabels.js` replaces a
swrl's labels (an empty list deletes the doc). The filter popup lists my labels
on my own lists and `State.labelFilters` holds the selection (a swrl must have
them all). Account deletion removes them with the rest of `swrlers/{uid}`.

### Private comments

`swrlers/{uid}/privateComments/{swrlID}/comments/{commentID}` holds
`{ text, created }`: one user's private notes about one Swrl
(`privateCommentsPath()` in `src/constants/Collection.js`). They live under
the user's own document, never on the shared `swrls` doc, so a security rule
can restrict them. Their privacy depends on the owner-only rule in
`firestore.rules` being the one live in the console (see above).

Any other per-user private data should follow the same shape: a subcollection
under `swrlers/{uid}` with its own owner-only rule, in `firestore.rules`, with a
rules test.


## Auth (`src/firebase/login.js`)

- Exposes `swrlUser` (mutable, current `firebase.User`), `setUpLogin(firebase, firestore)`,
  and `initialisedLogin` flag.
- On login success: writes/updates `swrlers/{uid}` doc (merge; deletes any
  `email`; sets `lastLoginTime`), starts the listeners
  (`setUpRecommendationsListener`, `setUpListEntriesListener`,
  `setUpFriendsListener`) and calls `updateDeviceToken(firestore)`. Own-data
  listeners start only for a signed-in, non-anonymous user.
- On logout: cancels listeners, clears caches, resets `swrlUser`.
- `deleteAccount` (Settings) deletes the Auth user only (re-authenticating when
  asked); the `userDeleted` function removes the data.
- Supports anonymous login (`loggingInAnonymousView`) as well as full auth.

When writing code that needs the current user, import `swrlUser` lazily —
it's `undefined` until `setUpLogin` resolves.

## Cloud Messaging (`src/firebase/messaging.js`)

- Enabled when `isSupported()` resolves true; asks for notification
  permission on start and calls `getToken(messaging, { vapidKey })`.
- Uses a hardcoded VAPID public key (safe to commit; the private key is in
  the Firebase console).
- Stores tokens in `messagingtokens` collection against `swrlUser.uid`.
- `src/firebase/messaging-sw.js` (built to `/firebase-messaging-sw.js`) shows
  notifications while the app is closed.

## Auth notes

- Google sign-in uses `signInWithPopup`. Redirect sign-in does not work off
  the `*.firebaseapp.com` domain (browsers partition the storage it needs).
- A new host must be on the Firebase Auth authorised-domains list
  (`scripts/firebase-auth-domains.sh`).
- On `swrl-list.com` / `www.swrl-list.com`, `authDomain` is the site itself
  and `server.js` passes `/__/auth/*` through to Firebase's helper pages, so
  Google's screen names our domain. Each such host needs
  `https://<host>/__/auth/handler` in the Google OAuth client's authorised
  redirect URIs (Google Cloud console → APIs & Services → Credentials). Other
  hosts use `swrl-1118.firebaseapp.com`.

## Cloud Functions (`functions/`)

- Node 22, `firebase-functions` (1st gen API, `firebase-functions/v1`) and
  the modular `firebase-admin` API (`firebase-admin/app`, `/firestore`,
  `/messaging`). 1st gen on purpose: a 2nd gen Firestore trigger must be
  deployed in a region matching the database's location.
- `listEntryCounts` - onWrite of `swrlers/{uid}/listEntries/{swrlID}`: applies the
  change in `later` / `done` / `loved` to `swrls/{swrlID}` with
  `FieldValue.increment` (`countDeltas` in `functions/listEntries.js`). The only
  writer of the count fields.
- `friendRequestAccepted` - onUpdate of a `friendRequests` doc whose status
  became `accepted`: writes both `friends` docs and deletes the request.
- `friendRemoved` - onDelete of a `friends` doc: deletes the mirror on the other
  side (idempotent).
- `friendRequestNotification` - onCreate of a friend request: push notification
  to the receiver (like `recommendationNotification`).
- `recommendationNotification` - on a new `recommendations` doc, sends a push
  notification to the receivers' tokens (`sendEachForMulticast`) and deletes
  tokens FCM reports as dead.
- `recommendationReplyNotification` - on a new reply, pushes to the other person
  in the thread (the receiver when the sender wrote it, otherwise the sender).
- `userActivityNotification` - watches `swrlers/{swrlerID}` and pings
  Pushover with a login/delete message. It alerts a login only when
  `lastLoginTime` changed (writing the profile for another reason, such as the
  default visibility, is not a login). The owner's uid is skipped by design.
- `userDeleted` - a 1st gen Auth trigger (`auth.user().onDelete`) that removes
  everything of a deleted account: `swrlers/{uid}` recursively (entries, friends,
  private comments; `listEntryCounts` brings the counts down), friend mirror
  docs, friend requests, tokens, saved searches, recommendations (sent ones
  deleted, received ones lose the uid) and any legacy uid arrays. Logic in
  `functions/deleteUserData.js` / `accountDeletion.js`. The client's
  `deleteAccount` only deletes the Auth user; this does the rest.
- Secrets: `PUSHOVER_TOKEN` / `PUSHOVER_USER` via `defineSecret`, stored in
  Secret Manager (created in `terraform/functions.tf`, filled from GitHub
  secrets by the deploy workflow).
- Pure logic lives in `functions/messages.js` and `functions/listEntries.js`
  (and `accountDeletion.js`) with tests in `functions/test/` (`node --test`).
- Deployed by the `deploy-functions` job (`firebase deploy --only functions`,
  every export of `functions/index.js`); no local Firebase login needed.
- Functions run only after the fact and asynchronously: anything that must be
  exactly right at one moment (like the migration's counts) has to be rechecked
  after a wait.

## Migration (`scripts/migrate-list-entries.js`)

One-off, run by the owner with admin credentials (Node 22,
`(cd functions && npm ci)`, `gcloud auth application-default login`): creates
the entries from the legacy arrays (never overwriting; skips uids without a
profile), recounts (`--recount`), and strips the arrays (`--strip-arrays`),
all with `--dry-run`. The rollout order and its caveats are in
`docs/friends-and-visibility-plan.md`.

## Gotchas

- `firebase.firestore.FieldValue` requires the `firebase/app` namespaced
  import to be present. Some action files do `var firebase = require(...)`
  with `var` — match the style, or ensure the import is hoisted.
- `enablePersistence` returns a promise that resolves after the tab election
  completes. If you open multiple tabs, only one gets persistence — the rest
  log `failed-precondition`. That's expected, not a bug.
- Old swrl docs may still carry the legacy uid arrays, and lack the count
  fields; only `Swrl.fromFirestore` (`countOrLegacy`) may look at the arrays.
- A function writing a count with `increment` on a doc that lacks the field
  starts it from zero, so a count can read low on an unmigrated doc until the
  migration's recount.
- Timestamps come back as Firestore `Timestamp`, not `Date`. Call
  `.toDate()` (the model class already does for `added` / `updated`).
