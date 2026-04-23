---
name: swrl-firebase
description: Use when touching Firestore, Firebase Auth, Cloud Messaging, or Cloud Functions. Covers the collection shapes, the v7 compat API quirks, and how auth / messaging / functions are wired up.
---

# Swrl Firebase layer

## SDK version — this matters

The app uses **Firebase JS SDK v7.x** (compat / namespaced API). Imports look
like:

```js
const firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");
require("firebase/messaging");
```

Do **not** use modular v9 imports (`import { getFirestore } from "firebase/firestore"`).
They will not work with this codebase and upgrading is a project in itself.

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

- Only enabled on `device.platform === 'browser'` when `firebase.messaging.isSupported()`.
- Uses a hardcoded VAPID public key (safe to commit; the private key is in
  the Firebase console).
- Stores tokens in `messagingtokens` collection against `swrlUser.uid`.
- For native iOS/Android, push is wired separately via Cordova plugins —
  don't try to use the JS SDK there.

## Cloud Functions (`functions/`)

- Node runtime is the default from when this was written (8/10). Keep changes
  conservative — deploying requires `firebase deploy --only functions` and a
  working local Firebase CLI login.
- Existing function: `userActivityNotification` — watches `swrlers/{swrlerID}`
  and pings Pushover with a login/delete message. The owner's uid
  (`hm7BIObShKVqU58e9O4Rj1JOK8k2`) is skipped by design.
- Secrets live in `functions.config().pushover.{token,user}`. Set via
  `firebase functions:config:set pushover.token=... pushover.user=...`.
- `functions/` has its own `package.json` — `npm install` there before deploy.

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
