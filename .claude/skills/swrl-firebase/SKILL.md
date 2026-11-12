---
name: swrl-firebase
description: Use when touching Firestore, Firebase Auth, Cloud Messaging, or Cloud Functions. Covers the collection shapes, the compat API rules, and how auth / messaging / functions are wired up.
---

# Swrl Firebase layer

## SDK version - this matters

The app uses the current **Firebase JS SDK through its compat layer**
(namespaced API). Imports look like:

```js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/messaging';
```

Do **not** mix in modular imports (`import { getFirestore } from "firebase/firestore"`)
piecemeal: the whole codebase passes compat objects around. Moving to the
modular API is a project of its own.

`src/firebase/init.js` calls `firebase.initializeApp(config)`, enables
unlimited Firestore cache, and turns on `enablePersistence({ synchronizeTabs: true })`.

## Firestore collections (`src/constants/Collection.js`)

| Collection | Key | Purpose |
| --- | --- | --- |
| `swrls` | `swrlID` (deterministic, from the source — e.g. `film-123`) | Every saved item. The same doc is shared by all users who have ever added that item; per-user state is held in arrays (`later`, `done`, `deleted`, `loved`, `isRecommended`) of `uid`s. |
| `swrlers` | user `uid` | User profile (displayName, email, photoURL). Written on login. |
| `recommendations` | auto id | Recommendation from one user to one or more others. Has `to: string[]` (uids) and `from`. |
| `messagingtokens` | auto id per device | FCM tokens associated with a `uid` for push notifications. |
| `savedsearches` | auto id | User-saved searches for discover. |

### Swrl shape (see `src/model/swrl.js`)

```
{
  type, category, swrlID, details,
  added, updated,               // serverTimestamp()
  later: string[],              // uids that have it saved
  done:  string[],              // uids that marked it done
  deleted: string[],            // uids that removed it
  loved: string[],              // uids that loved it
  isRecommended: string[],      // uids with an active recommendation
  recommendations: string[]     // recommendation doc ids
}
```

**Writing rule:** always `set(..., { merge: true })` and mutate the arrays via
`FieldValue.arrayUnion(uid)` / `arrayRemove(uid)`. Never read-modify-write —
you'll race other devices. `added`/`updated` must be `serverTimestamp()` to
avoid clock skew. See `src/actions/addSwrlToList.js` for the canonical shape.

### Reading rule

Listeners (`src/listeners/*`) use `onSnapshot` with `.where(...)` queries and
maintain a plain-object cache keyed by doc id. Views read from the cache
synchronously and re-render when the listener pings them. Don't do ad-hoc
`.get()` calls in views.

## Auth (`src/firebase/login.js`)

- Exposes `swrlUser` (mutable, current `firebase.User`), `setUpLogin(firebase, firestore)`,
  and `initialisedLogin` flag.
- On login success: writes/updates `swrlers/{uid}` doc, calls
  `setUpRecommendationsListener(firestore)`, and `updateDeviceToken(firestore)`.
- On logout: cancels listeners, clears caches, resets `swrlUser`.
- Supports anonymous login (`loggingInAnonymousView`) as well as full auth.

When writing code that needs the current user, import `swrlUser` lazily —
it's `undefined` until `setUpLogin` resolves.

## Cloud Messaging (`src/firebase/messaging.js`)

- Enabled when `firebase.messaging.isSupported()`; asks for notification
  permission on start and calls `getToken({ vapidKey })`.
- Uses a hardcoded VAPID public key (safe to commit; the private key is in
  the Firebase console).
- Stores tokens in `messagingtokens` collection against `swrlUser.uid`.
- `www/firebase-messaging-sw.js` shows notifications while the app is closed.

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
- `recommendationNotification` - on a new `recommendations` doc, sends a push
  notification to the receivers' tokens (`sendEachForMulticast`) and deletes
  tokens FCM reports as dead.
- `userActivityNotification` - watches `swrlers/{swrlerID}` and pings
  Pushover with a login/delete message. The owner's uid is skipped by design.
- Secrets: `PUSHOVER_TOKEN` / `PUSHOVER_USER` via `defineSecret`, stored in
  Secret Manager (created in `terraform/functions.tf`, filled from GitHub
  secrets by the deploy workflow).
- Pure logic lives in `functions/messages.js` with tests in `functions/test/`.
- Deployed by the `deploy-functions` job; no local Firebase login needed.

## Gotchas

- `firebase.firestore.FieldValue` requires the `firebase/app` namespaced
  import to be present. Some action files do `var firebase = require(...)`
  with `var` — match the style, or ensure the import is hoisted.
- `enablePersistence` returns a promise that resolves after the tab election
  completes. If you open multiple tabs, only one gets persistence — the rest
  log `failed-precondition`. That's expected, not a bug.
- Array fields default to `[]` in `Swrl.fromFirestore`. Don't assume they're
  present on the raw doc; old docs may be missing them entirely.
- Timestamps come back as Firestore `Timestamp`, not `Date`. Call
  `.toDate()` (the model class already does for `added` / `updated`).
