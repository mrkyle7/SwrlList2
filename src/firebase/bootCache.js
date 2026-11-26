import { usableBoot } from '../model/bootData';

/**
 * The saved copy the app opens from (model/bootData.js), in its own small
 * IndexedDB database. Firebase cannot help here: on start, Auth checks the
 * saved sign-in with the server before saying who is signed in, and Firestore
 * (its offline cache included) waits for Auth, so on a slow connection
 * nothing of mine could show for a whole round trip or more. This copy is
 * read in a few milliseconds, the first screen opens from it, and the live
 * listeners replace it as soon as Firebase is ready.
 *
 * Every call is best-effort: no IndexedDB, a private window, or a read that
 * takes too long just means starting the old way.
 */

const DB_NAME = 'swrl-boot';
const STORE = 'boot';
const KEY = 'last';
/** Longer than this and start-up goes on without the saved copy. */
const READ_TIMEOUT_MS = 500;
/** Writes are bunched: a burst of list changes saves once. */
const SAVE_DELAY_MS = 800;

/** @type {Promise<IDBDatabase | undefined> | undefined} */
let opening;

/** @return {Promise<IDBDatabase | undefined>} */
function open() {
    if (!opening) {
        opening = new Promise(resolve => {
            try {
                const request = indexedDB.open(DB_NAME, 1);
                request.onupgradeneeded = () => request.result.createObjectStore(STORE);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(undefined);
                request.onblocked = () => resolve(undefined);
            } catch (error) {
                resolve(undefined);
            }
        });
    }
    return opening;
}

/**
 * The saved copy, or undefined.
 *
 * @return {Promise<import('../model/bootData').BootData | undefined>}
 */
export function loadBootCache() {
    const read = open().then(db => db && new Promise(resolve => {
        try {
            const request = db.transaction(STORE).objectStore(STORE).get(KEY);
            request.onsuccess = () => resolve(usableBoot(request.result));
            request.onerror = () => resolve(undefined);
        } catch (error) {
            resolve(undefined);
        }
    }));
    const tooSlow = new Promise(resolve => setTimeout(() => resolve(undefined), READ_TIMEOUT_MS));
    return Promise.race([read, tooSlow]).then(data => data || undefined);
}

/** @type {ReturnType<typeof setTimeout> | undefined} */
let saveTimer;
/** @type {(() => import('../model/bootData').BootData | undefined) | undefined} */
let pendingSnapshot;

/**
 * Saves soon (bunched). Takes a function, so the data is gathered when the
 * save happens, not on every change.
 *
 * @param {() => import('../model/bootData').BootData | undefined} snapshot
 */
export function saveBootCacheSoon(snapshot) {
    pendingSnapshot = snapshot;
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = undefined;
        const data = pendingSnapshot && pendingSnapshot();
        pendingSnapshot = undefined;
        if (!data) return;
        open().then(db => {
            if (!db) return;
            try {
                db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, KEY);
            } catch (error) {
                console.error('Could not save the start-up copy', error);
            }
        });
    }, SAVE_DELAY_MS);
}

/** Forgets the saved copy (logout, account deleted, someone else signed in). */
export function clearBootCache() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = undefined;
    pendingSnapshot = undefined;
    return open().then(db => {
        if (!db) return;
        try {
            db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY);
        } catch (error) {
            // nothing saved, or no IndexedDB
        }
    });
}
