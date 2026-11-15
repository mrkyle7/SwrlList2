import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Collection, friendsPath } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { FriendRequest, friendFromFirestore, relationshipTo } from '../model/friendRequest';

/**
 * My friends (swrlers/{me}/friends), the requests sent to me and the requests
 * I sent (friendRequests, by `to` / `from`). Read them through the getters,
 * after `whenFriendsReady()`. Views that show friendship subscribe with
 * `addFriendsChangeListener` and unsubscribe when they are destroyed.
 */

/** @type {Object<string, import('../model/friendRequest').Friend>} */
const friendsCache = {};
/** @type {Object<string, FriendRequest>} */
const incomingCache = {};
/** @type {Object<string, FriendRequest>} */
const sentCache = {};

/** @type {Function[]} */
let unsubscribers = [];
let listeningUid;
let errorCount = 0;
let ready = true; // nothing to wait for until a user signs in
/** @type {Promise<void>} */
let readyPromise = Promise.resolve();
/** @type {Function[]} */
let resolveFirstSnapshots = [];
/** @type {Set<Function>} */
const changeListeners = new Set();
/** @type {Object<string, number>} when I pressed Accept, by requester uid */
const acceptingSince = {};
/** How long the UI says "Adding…" before admitting the function is slow. */
export const ACCEPTING_MILLIS = 5000;

export default { setUpFriendsListener, cancelFriendsListener };

/**
 * Starts the three listeners for the signed-in, non-anonymous user. Safe to
 * call again for the same user; does nothing then.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function setUpFriendsListener(firestore) {
    if (!swrlUser || swrlUser.isAnonymous) return;
    if (listeningUid === swrlUser.uid) return;
    cancelFriendsListener();
    const uid = swrlUser.uid;
    listeningUid = uid;
    ready = false;
    errorCount = 0;
    const firstSnapshots = [0, 1, 2].map(() => new Promise(resolve => resolveFirstSnapshots.push(resolve)));
    readyPromise = Promise.all(firstSnapshots).then(() => { ready = true; });
    // Equality filters on `from` / `to` only: that is what the rules allow.
    subscribe(firestore, uid, 0, collection(firestore, friendsPath(uid).join('/')), friendsCache,
        (id, data) => friendFromFirestore(id, data));
    subscribe(firestore, uid, 1, query(collection(firestore, Collection.FRIENDREQUESTS), where('to', '==', uid)),
        incomingCache, (id, data) => FriendRequest.fromFirestore(id, data));
    subscribe(firestore, uid, 2, query(collection(firestore, Collection.FRIENDREQUESTS), where('from', '==', uid)),
        sentCache, (id, data) => FriendRequest.fromFirestore(id, data));
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} uid
 * @param {number} index which of the three listeners
 * @param {import('firebase/firestore').Query} source
 * @param {Object<string, any>} cache
 * @param {(id: string, data: Object) => any} parse
 */
function subscribe(firestore, uid, index, source, cache, parse) {
    const resolveFirst = resolveFirstSnapshots[index];
    unsubscribers[index] = onSnapshot(source,
        querySnapshot => {
            if (listeningUid !== uid) return;
            errorCount = 0;
            querySnapshot.docChanges().forEach(docChange => {
                try {
                    if (docChange.type === 'removed') {
                        delete cache[docChange.doc.id];
                    } else {
                        cache[docChange.doc.id] = parse(docChange.doc.id, docChange.doc.data());
                    }
                } catch (error) {
                    console.error("Couldn't process friends document: ", docChange.doc.id);
                    console.error(error);
                }
            });
            if (resolveFirst) resolveFirst();
            notifyChanged();
        }, error => {
            errorCount++;
            console.error('Friends listener failed, error count: ' + errorCount);
            console.error(error);
            if (unsubscribers[index]) unsubscribers[index]();
            if (errorCount < 5 && listeningUid === uid) {
                //avoid an infinite loop by giving up after 5 consecutive errors
                subscribe(firestore, uid, index, source, cache, parse);
            } else {
                console.log('Giving up getting friends ready');
                if (resolveFirst) resolveFirst();
            }
        });
}

/** Stops listening and forgets everything (logout, anonymous user). */
export function cancelFriendsListener() {
    unsubscribers.forEach(unsubscribe => { if (unsubscribe) unsubscribe(); });
    unsubscribers = [];
    listeningUid = undefined;
    [friendsCache, incomingCache, sentCache].forEach(cache => Object.keys(cache).forEach(key => delete cache[key]));
    Object.keys(acceptingSince).forEach(key => delete acceptingSince[key]);
    // Anyone still waiting for the first snapshots must not hang.
    resolveFirstSnapshots.forEach(resolve => resolve());
    resolveFirstSnapshots = [];
    ready = true;
    readyPromise = Promise.resolve();
    notifyChanged();
}

/**
 * Whether the user is one of my accepted friends.
 *
 * @param {string} uid
 * @return {boolean}
 */
export function isFriend(uid) {
    return friendsCache[uid] !== undefined;
}

/**
 * My friends, in no particular order.
 *
 * @return {import('../model/friendRequest').Friend[]}
 */
export function getFriends() {
    return Object.keys(friendsCache).map(key => friendsCache[key]);
}

/**
 * Requests other people sent to me (including ones I have accepted that the
 * Cloud Function has not finished), oldest first.
 *
 * @return {FriendRequest[]}
 */
export function getIncomingRequests() {
    return sortRequests(incomingCache);
}

/**
 * Requests I sent, oldest first.
 *
 * @return {FriendRequest[]}
 */
export function getSentRequests() {
    return sortRequests(sentCache);
}

/**
 * @param {Object<string, FriendRequest>} cache
 * @return {FriendRequest[]}
 */
function sortRequests(cache) {
    const time = (/** @type {FriendRequest} */ r) => r.created ? r.created.getTime() : Number.MAX_SAFE_INTEGER;
    return Object.keys(cache).map(key => cache[key]).sort((a, b) => time(a) - time(b));
}

/**
 * How I relate to a user: one of `Relationship`.
 *
 * @param {string} uid
 * @return {string}
 */
export function getRelationshipTo(uid) {
    return relationshipTo(swrlUser ? swrlUser.uid : undefined, uid, {
        friendUids: Object.keys(friendsCache),
        incoming: getIncomingRequests(),
        sent: getSentRequests()
    });
}

/**
 * Whether the first snapshots have arrived, or there is no real user to wait for.
 *
 * @return {boolean}
 */
export function isFriendsReady() {
    return ready;
}

/**
 * Resolves once the first snapshots have arrived (immediately when nobody is
 * signed in with a real account, or after the listener has given up).
 *
 * @return {Promise<void>}
 */
export function whenFriendsReady() {
    return readyPromise;
}

/**
 * Calls `listener` whenever friends or requests change.
 *
 * @param {() => void} listener
 * @return {() => void} unsubscribe
 */
export function addFriendsChangeListener(listener) {
    changeListeners.add(listener);
    return () => { changeListeners.delete(listener); };
}

/**
 * Remembers that I just pressed Accept for a request from this user, so the
 * UI can say "Adding…" for a few seconds while the Cloud Function works.
 *
 * @param {string} fromUid
 */
export function markAccepting(fromUid) {
    acceptingSince[fromUid] = Date.now();
    setTimeout(notifyChanged, ACCEPTING_MILLIS + 50);
}

/**
 * Whether I accepted this user's request moments ago and they are not yet a
 * friend. After ACCEPTING_MILLIS the UI falls back to "Accepted, finishing up…".
 *
 * @param {string} fromUid
 * @return {boolean}
 */
export function isAccepting(fromUid) {
    const since = acceptingSince[fromUid];
    return since !== undefined && !isFriend(fromUid) && Date.now() - since < ACCEPTING_MILLIS;
}

function notifyChanged() {
    updateBadge();
    changeListeners.forEach(listener => {
        try {
            listener();
        } catch (error) {
            console.error('A friends change listener failed');
            console.error(error);
        }
    });
}

/**
 * Number of pending requests waiting for my answer.
 *
 * @return {number}
 */
export function pendingRequestCount() {
    return getIncomingRequests().filter(request => !request.isAccepted).length;
}

/** Shows the pending-request count on the Friends menu item and a dot on the menu button. */
function updateBadge() {
    const count = pendingRequestCount();
    const badge = document.getElementById('friendsBadge');
    if (badge) {
        badge.innerText = count.toString();
        badge.classList.toggle('hidden', count === 0);
    }
    const menuButton = document.getElementById('menuButton');
    if (menuButton) menuButton.classList.toggle('hasFriendRequests', count > 0);
}
