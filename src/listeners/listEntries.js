import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Collection, listEntriesPath } from '../constants/Collection';
import { DEFAULT_VISIBILITY, PRIVATE, Visibility, visibilityFromId } from '../constants/Visibility';
import { swrlUser } from '../firebase/login';
import { ListEntry } from '../model/listEntry';

/**
 * My own list entries (swrlers/{uid}/listEntries), keyed by swrlID. This is
 * the only source of "is it on my list / done / loved / deleted". Read it
 * through getListEntry / getAllListEntries, after `whenListEntriesReady()`.
 *
 * @type {Object<string, ListEntry>}
 */
const listEntriesCache = {};

let currentListener;
let listeningUid;
let errorCount = 0;
let ready = true; // nothing to wait for until a user signs in
/** @type {Promise<void>} */
let readyPromise = Promise.resolve();
/** @type {Function} */
let resolveFirstSnapshot;
/** @type {Visibility} */
let defaultVisibility = DEFAULT_VISIBILITY;

export default { setUpListEntriesListener, cancelListEntriesListener };

/**
 * Starts listening to the signed-in user's entries and reads their default
 * visibility. Safe to call again for the same user (login calls it from two
 * places); does nothing then.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function setUpListEntriesListener(firestore) {
    if (!swrlUser) return;
    if (listeningUid === swrlUser.uid) return;
    cancelListEntriesListener();
    listeningUid = swrlUser.uid;
    ready = false;
    errorCount = 0;
    const firstSnapshot = new Promise(resolve => resolveFirstSnapshot = resolve);
    readyPromise = Promise.all([firstSnapshot, loadDefaultVisibility(firestore, swrlUser.uid)])
        .then(() => { ready = true; });
    subscribe(firestore, swrlUser.uid);
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} uid
 */
function subscribe(firestore, uid) {
    currentListener = onSnapshot(collection(firestore, listEntriesPath(uid).join('/')),
        querySnapshot => {
            errorCount = 0; //reset the error count to avoid long term errors bubbling
            querySnapshot.docChanges().forEach(docChange => {
                try {
                    if (docChange.type === 'removed') {
                        delete listEntriesCache[docChange.doc.id];
                    } else {
                        listEntriesCache[docChange.doc.id] = ListEntry.fromFirestore(docChange.doc.data());
                    }
                } catch (error) {
                    console.error("Couldn't process list entry: ", docChange.doc.id, docChange.doc.data());
                    console.error(error);
                }
            });
            resolveFirstSnapshot();
        }, error => {
            errorCount++;
            console.error('List entries listener failed, error count: ' + errorCount);
            console.error(error);
            if (currentListener) currentListener();
            if (errorCount < 5 && listeningUid === uid) {
                //avoid an infinite loop by giving up after 5 consecutive errors
                subscribe(firestore, uid);
            } else {
                console.log('Giving up getting list entries ready');
                resolveFirstSnapshot();
            }
        });
}

/**
 * Reads `defaultVisibility` from the user's swrlers doc (absent means
 * friends). When the read fails the default is unknown, so fail closed:
 * entries made meanwhile are private rather than shared by mistake.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} uid
 * @return {Promise<void>}
 */
async function loadDefaultVisibility(firestore, uid) {
    try {
        const swrlerDoc = await getDoc(doc(firestore, Collection.SWRLERS, uid));
        defaultVisibility = visibilityFromId(swrlerDoc.exists() ? swrlerDoc.data().defaultVisibility : undefined);
    } catch (error) {
        console.error("Couldn't read the default visibility, new entries will be private");
        console.error(error);
        defaultVisibility = PRIVATE;
    }
}

/** Stops listening and forgets everything (logout, anonymous user). */
export function cancelListEntriesListener() {
    if (currentListener) {
        currentListener(); // 'calling' the onSnapshot unsubscribes from it.
        currentListener = undefined;
    }
    listeningUid = undefined;
    Object.keys(listEntriesCache).forEach(key => delete listEntriesCache[key]);
    defaultVisibility = DEFAULT_VISIBILITY;
    // Anyone still waiting for the first snapshot must not hang.
    if (resolveFirstSnapshot) resolveFirstSnapshot();
    resolveFirstSnapshot = undefined;
    ready = true;
    readyPromise = Promise.resolve();
}

/**
 * My entry for a swrl.
 *
 * @param {string} swrlID
 * @return {ListEntry | undefined}
 */
export function getListEntry(swrlID) {
    return listEntriesCache[swrlID];
}

/**
 * All my entries, in no particular order.
 *
 * @return {ListEntry[]}
 */
export function getAllListEntries() {
    return Object.keys(listEntriesCache).map(key => listEntriesCache[key]);
}

/**
 * Whether the first snapshot (and my default visibility) has arrived, or
 * there is no signed-in user to wait for.
 *
 * @return {boolean}
 */
export function isListEntriesReady() {
    return ready;
}

/**
 * Resolves once the first snapshot and my default visibility have loaded, so
 * a view can wait instead of rendering an empty list. Resolves straight away
 * when nobody is signed in (or after the listener has given up).
 *
 * @return {Promise<void>}
 */
export function whenListEntriesReady() {
    return readyPromise;
}

/**
 * My current default visibility, applied to new entries. A later phase adds
 * the setting and calls setCurrentDefaultVisibility.
 *
 * @return {Visibility}
 */
export function getDefaultVisibility() {
    return defaultVisibility;
}

/**
 * Updates the in-memory default (after the user changes the setting).
 *
 * @param {Visibility} visibility
 */
export function setCurrentDefaultVisibility(visibility) {
    defaultVisibility = visibility;
}
