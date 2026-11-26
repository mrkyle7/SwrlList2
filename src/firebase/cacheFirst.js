import { getDoc, getDocFromCache, getDocs, getDocsFromCache } from 'firebase/firestore';

/**
 * Reads that open from the local cache (the Firestore persistent cache, see
 * firebase/init.js) and catch up with the server afterwards, so a screen
 * never waits on the network for something the app has seen before.
 *
 * Plain getDoc / getDocs ask the server first and only fall back to the cache
 * when offline: on a slow or flaky connection that is seconds per read. These
 * return the cached copy at once when there is one, still ask the server in
 * the background (the same one read as before; it also refreshes the cache
 * for next time), and hand the server's answer to `onFresh` only when it
 * differs. With nothing cached they wait for the server, as before.
 *
 * Tested through the views (no emulator in unit tests); `changedData` is pure.
 */

/**
 * Whether the server's answer differs from what was shown.
 *
 * @param {{exists: () => boolean, data: () => any} | undefined} shown
 * @param {{exists: () => boolean, data: () => any}} fresh
 * @return {boolean}
 */
export function changedDoc(shown, fresh) {
    if (!shown) return true;
    if (shown.exists() !== fresh.exists()) return true;
    return shown.exists() && changedData(shown.data(), fresh.data());
}

/**
 * @param {any} a
 * @param {any} b
 * @return {boolean}
 */
export function changedData(a, b) {
    return JSON.stringify(a) !== JSON.stringify(b);
}

/**
 * @param {import('firebase/firestore').DocumentReference} ref
 * @param {(fresh: import('firebase/firestore').DocumentSnapshot) => void} [onFresh]
 *        the server's copy, when it differs from the cached one returned
 * @return {Promise<import('firebase/firestore').DocumentSnapshot>}
 */
export async function getDocFast(ref, onFresh) {
    /** @type {import('firebase/firestore').DocumentSnapshot | undefined} */
    let cached;
    try {
        cached = await getDocFromCache(ref);
    } catch (error) {
        cached = undefined; // not in the cache
    }
    // a cached "does not exist" may just mean never fetched: ask the server
    if (!cached || !cached.exists()) return getDoc(ref);
    getDoc(ref)
        .then(fresh => { if (onFresh && changedDoc(cached, fresh)) onFresh(fresh); })
        .catch(() => undefined); // offline: the cached copy stands
    return cached;
}

/**
 * The same for a query. A query never run before may find some of its
 * documents in the cache (fetched by other queries): those show at once and
 * `onFresh` brings the full answer.
 *
 * @param {import('firebase/firestore').Query} q
 * @param {(fresh: import('firebase/firestore').QuerySnapshot) => void} [onFresh]
 * @return {Promise<import('firebase/firestore').QuerySnapshot>}
 */
export async function getDocsFast(q, onFresh) {
    /** @type {import('firebase/firestore').QuerySnapshot | undefined} */
    let cached;
    try {
        cached = await getDocsFromCache(q);
    } catch (error) {
        cached = undefined;
    }
    if (!cached || cached.empty) return getDocs(q);
    const shownIds = cached.docs.map(d => d.id + JSON.stringify(d.data()));
    getDocs(q)
        .then(fresh => {
            const freshIds = fresh.docs.map(d => d.id + JSON.stringify(d.data()));
            if (onFresh && changedData(shownIds, freshIds)) onFresh(fresh);
        })
        .catch(() => undefined);
    return cached;
}
