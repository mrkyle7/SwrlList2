import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth';
import {
    CACHE_SIZE_UNLIMITED, connectFirestoreEmulator, initializeFirestore,
    persistentLocalCache, persistentMultipleTabManager
} from 'firebase/firestore';
import { firebaseConfig } from './config';

// Hosts where server.js serves Firebase's sign-in helper pages (/__/auth/*)
// itself, so sign-in happens on our own domain. Each needs
// https://<host>/__/auth/handler among the Google OAuth client's authorised
// redirect URIs. Anywhere else (localhost, the run.app URL) falls back to the
// Firebase-hosted helper.
const OWN_AUTH_DOMAINS = ['swrl-list.com', 'www.swrl-list.com'];

/**
 * @returns {{app: import('firebase/app').FirebaseApp, firestore: import('firebase/firestore').Firestore}}
 */
export default function initialiseFirebase() {
    const app = initializeApp(Object.assign({}, firebaseConfig, {
        authDomain: OWN_AUTH_DOMAINS.includes(window.location.hostname)
            ? window.location.hostname
            : firebaseConfig.authDomain
    }));

    // Offline cache in IndexedDB, shared between tabs, never evicted.
    const firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
            cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
    });

    // Auth from the signed-in user saved on this device, with no sign-in
    // helper loaded at start: getAuth() also loads the popup/redirect helper
    // (an iframe from the auth domain) and holds back "who is signed in" until
    // it answers, a whole round trip on a slow connection before anything of
    // mine could show. The helper is given to the popup calls themselves
    // (login.js, deleteAccount.js). getAuth(app) elsewhere returns this one.
    const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });

    // Set by `npm run build:emulators` only; in a normal build this is `false`
    // and the block is removed.
    if (USE_FIREBASE_EMULATORS) {
        connectFirestoreEmulator(firestore, 'localhost', 8085);
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }

    return { app, firestore };
}
