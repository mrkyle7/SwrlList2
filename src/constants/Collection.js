export const Collection = {
    SWRLS: 'swrls',
    SWRLERS: 'swrlers',
    RECOMMENDATIONS: 'recommendations',
    MESSAGINGTOKENS: 'messagingtokens',
    SAVEDSEARCHES: 'savedsearches',
    SHARES: 'shares',
    FRIENDREQUESTS: 'friendRequests'
}
Object.freeze(Collection);

/**
 * Where one user's private comments about one Swrl live:
 * swrlers/{uid}/privateComments/{swrlID}/comments/{commentID}.
 *
 * They sit under the user's own document, not on the shared swrls document,
 * so that a security rule can limit them to that user.
 *
 * @param {string} uid
 * @param {string} swrlID
 * @return {string[]} path segments, for collection(firestore, ...segments)
 */
export const privateCommentsPath = (uid, swrlID) =>
    [Collection.SWRLERS, uid, 'privateComments', swrlID, 'comments'];


/** Name of the per-user subcollection of list entries, also used for collection group queries. */
export const LIST_ENTRIES = 'listEntries';

/**
 * Where one user's list entries live: swrlers/{uid}/listEntries.
 *
 * @param {string} uid
 * @return {string[]} path segments, for collection(firestore, ...segments)
 */
export const listEntriesPath = (uid) => [Collection.SWRLERS, uid, LIST_ENTRIES];

/**
 * One user's entry for one swrl: swrlers/{uid}/listEntries/{swrlID}.
 *
 * @param {string} uid
 * @param {string} swrlID
 * @return {string[]} path segments, for doc(firestore, ...segments)
 */
export const listEntryPath = (uid, swrlID) => [...listEntriesPath(uid), swrlID];

/**
 * Where one user's friends live: swrlers/{uid}/friends/{friendUid}.
 *
 * @param {string} uid
 * @return {string[]} path segments, for collection(firestore, ...segments)
 */
export const friendsPath = (uid) => [Collection.SWRLERS, uid, 'friends'];

/**
 * Id of the friend request from one user to another.
 *
 * @param {string} from uid of the sender
 * @param {string} to uid of the receiver
 * @return {string}
 */
export const friendRequestId = (from, to) => `${from}_${to}`;

/**
 * Where one user's private labels live: swrlers/{uid}/labels/{swrlID}, one
 * doc per swrl holding `{ labels: string[], updated }`.
 *
 * Like private comments they sit under the user's own document, not on the
 * list entry (which friends or everyone may read), so only the owner sees them.
 *
 * @param {string} uid
 * @return {string[]} path segments, for collection(firestore, ...segments)
 */
export const labelsPath = (uid) => [Collection.SWRLERS, uid, 'labels'];
