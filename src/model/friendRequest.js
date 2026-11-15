import { assertObjectHasDefinedProperty } from '../utils/propertyChecker';

/** What a friend request document holds, as far as the client cares. */
export class FriendRequest {
    /**
     * @param {string} id document id, `${from}_${to}`
     * @param {string} from uid of the sender
     * @param {string} to uid of the receiver
     * @param {string} status 'pending' or 'accepted'
     * @param {Date} [created] undefined while the server timestamp is pending
     */
    constructor(id, from, to, status, created) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.status = status;
        this.created = created;
    }

    /** Accepted by the receiver; a Cloud Function is still making them friends. */
    get isAccepted() {
        return this.status === 'accepted';
    }

    /**
     * @param {string} id
     * @param {Object} json
     * @return {FriendRequest}
     */
    static fromFirestore(id, json) {
        ['from', 'to'].forEach(p => assertObjectHasDefinedProperty(json, p));
        const created = json.created && typeof json.created.toDate === 'function' ? json.created.toDate() : undefined;
        return new FriendRequest(id, json.from, json.to, json.status === 'accepted' ? 'accepted' : 'pending', created);
    }
}

/**
 * A friends doc (swrlers/{me}/friends/{friendUid}).
 *
 * @typedef {{uid: string, since?: Date}} Friend
 */

/**
 * @param {string} id the document id, which is the friend's uid
 * @param {Object} json
 * @return {Friend}
 */
export function friendFromFirestore(id, json) {
    const since = json && json.since && typeof json.since.toDate === 'function' ? json.since.toDate() : undefined;
    return { uid: id, since };
}

/** How I relate to another user. */
export const Relationship = Object.freeze({
    SELF: 'self',
    FRIEND: 'friend',
    REQUEST_SENT: 'request-sent',
    REQUEST_RECEIVED: 'request-received',
    NONE: 'none'
});

/**
 * My relationship to a uid, from my friends and my requests. A friend wins
 * over a leftover request, a request they sent me over one I sent them.
 *
 * @param {string} myUid
 * @param {string} uid
 * @param {{friendUids: Iterable<string>, incoming: FriendRequest[], sent: FriendRequest[]}} data
 * @return {string} one of Relationship
 */
export function relationshipTo(myUid, uid, data) {
    if (myUid && myUid === uid) return Relationship.SELF;
    for (const friendUid of data.friendUids) {
        if (friendUid === uid) return Relationship.FRIEND;
    }
    if (data.incoming.some(request => request.from === uid)) return Relationship.REQUEST_RECEIVED;
    if (data.sent.some(request => request.to === uid)) return Relationship.REQUEST_SENT;
    return Relationship.NONE;
}

/** Fewest typed characters before the add-a-friend search shows anyone. */
export const MIN_SEARCH_LENGTH = 2;
/** Most matches the add-a-friend search shows. */
export const MAX_SEARCH_RESULTS = 20;

/**
 * Swrlers whose display name contains the typed text (case-insensitive), me
 * excluded, sorted by name. Matches the display name only, never an email.
 * Nothing is returned for fewer than MIN_SEARCH_LENGTH characters, so the
 * screen never lists everyone.
 *
 * @template {{uid: string, displayName?: string}} T
 * @param {T[]} swrlers
 * @param {string} text what was typed
 * @param {string} myUid
 * @param {number} [limit]
 * @return {{matches: T[], total: number}} the first `limit` matches and how many there were
 */
export function findSwrlersByName(swrlers, text, myUid, limit = MAX_SEARCH_RESULTS) {
    const needle = (text || '').trim().toLowerCase();
    if (needle.length < MIN_SEARCH_LENGTH) return { matches: [], total: 0 };
    const all = swrlers
        .filter(s => s && s.uid !== myUid && typeof s.displayName === 'string'
            && s.displayName.toLowerCase().includes(needle))
        .sort((a, b) => a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase()));
    return { matches: all.slice(0, limit), total: all.length };
}
