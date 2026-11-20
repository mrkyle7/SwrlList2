import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Collection, listEntriesPath } from '../constants/Collection';
import { DEFAULT_VISIBILITY, PRIVATE, Visibility, visibilityFromId } from '../constants/Visibility';
import { swrlUser } from '../firebase/login';
import { ListEntry } from '../model/listEntry';
import { DEFAULT_PAGE_LAYOUT, PageLayout, pageLayoutFromId } from '../model/swrlPage';
import { DEFAULT_LIST_VIEW, ListView, listViewFromId } from '../model/listView';
import { DEFAULT_HOME_LAYOUT, HomeLayout, homeLayoutFromId } from '../model/homeLayout';

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
/** How I like the swrl page laid out (my profile's `swrlPageLayout`).
 * @type {PageLayout} */
let pageLayout = DEFAULT_PAGE_LAYOUT;
/** How I like lists of swrls shown (my profile's `listView`).
 * @type {ListView} */
let listView = DEFAULT_LIST_VIEW;
/** How I like the home screen on phones (my profile's `homeLayout`).
 * @type {HomeLayout} */
let homeLayout = DEFAULT_HOME_LAYOUT;
/** @type {Set<(layout: HomeLayout) => void>} */
const homeLayoutListeners = new Set();

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
    // keep the home layout meanwhile: the profile read below sets it, and
    // resetting it first would flash the tiles before the cards
    stopListening();
    listeningUid = swrlUser.uid;
    ready = false;
    errorCount = 0;
    const firstSnapshot = new Promise(resolve => resolveFirstSnapshot = resolve);
    readyPromise = Promise.all([firstSnapshot, loadProfileSettings(firestore, swrlUser.uid)])
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
            changeListeners.forEach(listener => {
                try {
                    listener();
                } catch (error) {
                    console.error(error);
                }
            });
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
 * Reads my settings from my swrlers doc: `defaultVisibility` (absent means
 * friends), `swrlPageLayout` (absent means tabs), `listView` (absent
 * means compact) and `homeLayout` (absent means tiles). When the read fails the
 * default visibility is unknown, so fail closed: entries made meanwhile are
 * private rather than shared by mistake. The page layout, list view and
 * home layout just stay at their defaults then.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} uid
 * @return {Promise<void>}
 */
async function loadProfileSettings(firestore, uid) {
    try {
        const swrlerDoc = await getDoc(doc(firestore, Collection.SWRLERS, uid));
        const data = swrlerDoc.exists() ? swrlerDoc.data() : {};
        defaultVisibility = visibilityFromId(data.defaultVisibility);
        pageLayout = pageLayoutFromId(data.swrlPageLayout);
        listView = listViewFromId(data.listView);
        setCurrentHomeLayout(homeLayoutFromId(data.homeLayout));
    } catch (error) {
        console.error("Couldn't read the default visibility, new entries will be private");
        console.error(error);
        defaultVisibility = PRIVATE;
    }
}

/** Stops listening and forgets everything (logout, anonymous user). */
export function cancelListEntriesListener() {
    stopListening();
    setCurrentHomeLayout(DEFAULT_HOME_LAYOUT);
}

/** Stops listening and forgets my entries and settings, except the home layout. */
function stopListening() {
    if (currentListener) {
        currentListener(); // 'calling' the onSnapshot unsubscribes from it.
        currentListener = undefined;
    }
    listeningUid = undefined;
    Object.keys(listEntriesCache).forEach(key => delete listEntriesCache[key]);
    defaultVisibility = DEFAULT_VISIBILITY;
    pageLayout = DEFAULT_PAGE_LAYOUT;
    listView = DEFAULT_LIST_VIEW;
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
 * My current default visibility, applied to new entries (changed on the
 * Settings screen, which calls setCurrentDefaultVisibility).
 *
 * @return {Visibility}
 */
export function getDefaultVisibility() {
    return defaultVisibility;
}

/** @type {Set<() => void>} */
const changeListeners = new Set();

/**
 * Calls `listener` whenever the entries cache has changed (a local write
 * counts), so a view showing one entry's state can follow it live.
 *
 * @param {() => void} listener
 * @return {() => void} call it to stop listening
 */
export function addListEntriesChangeListener(listener) {
    changeListeners.add(listener);
    return () => { changeListeners.delete(listener); };
}

/**
 * Updates the in-memory default (after the user changes the setting).
 *
 * @param {Visibility} visibility
 */
export function setCurrentDefaultVisibility(visibility) {
    defaultVisibility = visibility;
}

/**
 * How I like the swrl page laid out. The default until I choose (and for
 * anyone not signed in).
 *
 * @return {PageLayout}
 */
export function getPageLayout() {
    return pageLayout;
}

/**
 * Updates the in-memory layout (after the user changes the setting).
 *
 * @param {PageLayout} layout
 */
export function setCurrentPageLayout(layout) {
    pageLayout = layout;
}

/**
 * How I like lists of swrls shown: compact rows or detailed cards. The
 * default until I choose (and for anyone not signed in).
 *
 * @return {ListView}
 */
export function getListView() {
    return listView;
}

/**
 * Updates the in-memory list view (when the user flips the switch).
 *
 * @param {ListView} view
 */
export function setCurrentListView(view) {
    listView = view;
}

/**
 * How I like the home screen on phones: the four big tiles or the cards.
 * The default until I choose (and for anyone not signed in).
 *
 * @return {HomeLayout}
 */
export function getHomeLayout() {
    return homeLayout;
}

/**
 * Updates the in-memory home layout (read from my profile, changed on
 * Settings, or reset at logout) and tells whoever is listening.
 *
 * @param {HomeLayout} layout
 */
export function setCurrentHomeLayout(layout) {
    homeLayout = layout;
    homeLayoutListeners.forEach(listener => {
        try {
            listener(layout);
        } catch (error) {
            console.error(error);
        }
    });
}

/**
 * Calls `listener` whenever the home layout changes.
 *
 * @param {(layout: HomeLayout) => void} listener
 */
export function addHomeLayoutListener(listener) {
    homeLayoutListeners.add(listener);
}
