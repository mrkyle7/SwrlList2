import { collection, doc, onSnapshot } from 'firebase/firestore';
import { getDocFast } from '../firebase/cacheFirst';
import { Collection, listEntriesPath } from '../constants/Collection';
import { DEFAULT_VISIBILITY, PRIVATE, Visibility, visibilityFromId } from '../constants/Visibility';
import { swrlUser } from '../firebase/login';
import { ListEntry } from '../model/listEntry';
import { DEFAULT_PAGE_LAYOUT, PageLayout, pageLayoutFromId } from '../model/swrlPage';
import { DEFAULT_LIST_VIEW, ListView, listViewFromId } from '../model/listView';
import { DEFAULT_HOME_LAYOUT, HomeLayout, homeLayoutFromId } from '../model/homeLayout';
import { DEFAULT_QUICK_ADD, QuickAddMode, quickAddFromId } from '../model/quickAdd';
import { BOOT_VERSION, entryFromBoot, entryToBoot } from '../model/bootData';
import { saveBootCacheSoon } from '../firebase/bootCache';

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
/** What the search button does (my profile's `quickAddButton`). @type {QuickAddMode} */
let quickAdd = DEFAULT_QUICK_ADD;
/** Whose saved copy the cache was filled from at start-up (primeListEntries), until the live listener replaces it. */
let primedUid;
/** The next snapshot is the live listener's first: it replaces the saved copy outright. */
let replaceOnNextSnapshot = false;
/**
 * Entries I changed here lately (swrlID to when): the server confirming such
 * a write (a resolved timestamp) is still my change, not news from elsewhere.
 * @type {Map<string, number>}
 */
const recentLocalWrites = new Map();
const LOCAL_WRITE_MS = 15000;

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
    const primed = primedUid === swrlUser.uid;
    if (primed) {
        // opened from the saved copy: keep showing it (ready already) and let
        // the live listener's first snapshot replace it, with no empty moment
        if (currentListener) currentListener();
        currentListener = undefined;
        listeningUid = swrlUser.uid;
        errorCount = 0;
        replaceOnNextSnapshot = true;
        loadProfileSettings(firestore, swrlUser.uid);
        subscribe(firestore, swrlUser.uid);
        return;
    }
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
 * Fills my entries and settings from the copy saved on this device, so the
 * first screen opens before Firebase has started (see firebase/bootCache.js).
 * The live listener replaces it once signed in (setUpListEntriesListener).
 *
 * @param {import('../model/bootData').BootData} boot
 */
export function primeListEntries(boot) {
    if (listeningUid) return; // the live listener is already running
    Object.keys(listEntriesCache).forEach(key => delete listEntriesCache[key]);
    boot.entries.forEach(raw => {
        const entry = entryFromBoot(raw);
        if (entry) listEntriesCache[entry.swrlID] = entry;
    });
    const settings = boot.settings || {};
    defaultVisibility = settings.defaultVisibility ? visibilityFromId(settings.defaultVisibility) : PRIVATE;
    pageLayout = pageLayoutFromId(settings.swrlPageLayout);
    listView = listViewFromId(settings.listView);
    setCurrentHomeLayout(homeLayoutFromId(settings.homeLayout));
    quickAdd = quickAddFromId(settings.quickAddButton);
    primedUid = boot.user.uid;
    ready = true;
    readyPromise = Promise.resolve();
    notifyChange({ remote: true });
}

/**
 * Calls everyone watching my entries.
 *
 * @param {{remote: boolean}} [change] remote: it came from the server or the
 *        saved copy (another device, the live list replacing the saved one),
 *        not from a tap here (Firestore marks those as pending writes)
 */
function notifyChange(change = { remote: false }) {
    changeListeners.forEach(listener => {
        try {
            listener(change);
        } catch (error) {
            console.error(error);
        }
    });
}

/** Saves my entries and settings on the device, to open from next time (soon, bunched). */
function saveForNextStart() {
    if (!swrlUser || swrlUser.isAnonymous || listeningUid !== swrlUser.uid) return;
    const user = swrlUser;
    saveBootCacheSoon(() => ({
        version: BOOT_VERSION,
        savedAt: Date.now(),
        user: { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL },
        settings: {
            defaultVisibility: defaultVisibility.id,
            swrlPageLayout: pageLayout.id,
            listView: listView.id,
            homeLayout: homeLayout.id,
            quickAddButton: quickAdd.id
        },
        entries: Object.keys(listEntriesCache).map(key => entryToBoot(listEntriesCache[key]))
    }));
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} uid
 */
function subscribe(firestore, uid) {
    currentListener = onSnapshot(collection(firestore, listEntriesPath(uid).join('/')),
        querySnapshot => {
            errorCount = 0; //reset the error count to avoid long term errors bubbling
            // Whether views should treat this as news from elsewhere (another
            // device, or the live list replacing the saved copy) rather than
            // a tap here, whose own write the server is just confirming.
            let fromElsewhere = false;
            if (replaceOnNextSnapshot) {
                // the live list replaces the saved copy: anything removed meanwhile goes
                replaceOnNextSnapshot = false;
                primedUid = undefined;
                fromElsewhere = true;
                Object.keys(listEntriesCache).forEach(key => delete listEntriesCache[key]);
            }
            const now = Date.now();
            querySnapshot.docChanges().forEach(docChange => {
                if (docChange.doc.metadata.hasPendingWrites) {
                    recentLocalWrites.set(docChange.doc.id, now);
                } else if (!(now - (recentLocalWrites.get(docChange.doc.id) || 0) < LOCAL_WRITE_MS)) {
                    fromElsewhere = true;
                }
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
            if (resolveFirstSnapshot) resolveFirstSnapshot();
            notifyChange({ remote: fromElsewhere });
            saveForNextStart();
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
 * means compact), `homeLayout` (absent means cards) and `quickAddButton` (absent
 * means search). When the read fails the
 * default visibility is unknown, so fail closed: entries made meanwhile are
 * private rather than shared by mistake. The page layout, list view and
 * home layout just stay at their defaults then.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} uid
 * @return {Promise<void>}
 */
async function loadProfileSettings(firestore, uid) {
    // from the cache at once when we have it (starting never waits on the
    // network); the server's copy, if different, is applied when it arrives
    const apply = (/** @type {import('firebase/firestore').DocumentSnapshot} */ swrlerDoc) => {
        const data = swrlerDoc.exists() ? swrlerDoc.data() : {};
        defaultVisibility = visibilityFromId(data.defaultVisibility);
        pageLayout = pageLayoutFromId(data.swrlPageLayout);
        listView = listViewFromId(data.listView);
        setCurrentHomeLayout(homeLayoutFromId(data.homeLayout));
        quickAdd = quickAddFromId(data.quickAddButton);
    };
    try {
        apply(await getDocFast(doc(firestore, Collection.SWRLERS, uid), apply));
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
    quickAdd = DEFAULT_QUICK_ADD;
}

/** Stops listening and forgets my entries and settings, except the home layout. */
function stopListening() {
    if (currentListener) {
        currentListener(); // 'calling' the onSnapshot unsubscribes from it.
        currentListener = undefined;
    }
    listeningUid = undefined;
    primedUid = undefined;
    replaceOnNextSnapshot = false;
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

/** @type {Set<(change: {remote: boolean}) => void>} */
const changeListeners = new Set();

/**
 * Calls `listener` whenever the entries cache has changed (a local write
 * counts), so a view showing one entry's state can follow it live. It is told
 * whether the change came from elsewhere (`remote`) or from a tap here.
 *
 * @param {(change: {remote: boolean}) => void} listener
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
    saveForNextStart();
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
    saveForNextStart();
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
    saveForNextStart();
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

/**
 * What the search button at the bottom right does: search everything, a
 * menu of categories, or the swirl. The default until I choose.
 *
 * @return {QuickAddMode}
 */
export function getQuickAdd() {
    return quickAdd;
}

/**
 * @param {QuickAddMode} mode
 */
export function setCurrentQuickAdd(mode) {
    quickAdd = mode;
    saveForNextStart();
}
