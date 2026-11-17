import { Swrl } from "./swrl";
import { Collection } from "../constants/Collection";

export class Recommendation {
    
    /** @type {Swrl} */
    swrl = undefined;

    /** @type {import('firebase/auth').User} */
    fromSwrler = undefined;

    /** @type {string[]} */
    toSwrlers = undefined

    /**
     * @param {string} id
     * @param {string} from
     * @param {string[]} to
     * @param {string} message
     * @param {string} swrlID
     * @param {Date} created
     * @param {string[]} read
     * @param {string[]} dismissed
     */
    constructor(id, from, to, message, swrlID, created, read, dismissed) {
        this.id = id;
        this.from = from;
        this.to = to;
        this.message = message;
        this.swrlID = swrlID;
        this.created = created;
        this.read = read || [];
        this.dismissed = dismissed || [];
    }

    /**
     * @param {import('firebase/firestore').QueryDocumentSnapshot} doc
     * @param {import('firebase/firestore').Firestore} firestore
     * @return {Recommendation}
     */
    static fromFirestore(doc, firestore) {
        const data = doc.data();
        return new Recommendation(doc.id, data.from, data.to, data.message, data.swrlID,
            data.created !== undefined && data.created != null ? data.created.toDate() : undefined,
            data.read,
            data.dismissed);
    }
}

/**
 * Whether any recommendation in an inbox cache is for the given swrl, i.e.
 * the swrl was recommended to the inbox's owner.
 *
 * @param {Object<string, Recommendation>} inboxCache recommendations keyed by id
 * @param {string} swrlID
 * @return {boolean}
 */
export function inboxHasSwrl(inboxCache, swrlID) {
    return Object.keys(inboxCache).some(id => inboxCache[id].swrlID === swrlID);
}

/**
 * The one line on a card that says why a swrl is there: who recommended it
 * and what they said.
 *
 * @param {string[]} names who recommended it, newest first
 * @param {string} [message] the newest recommendation's message
 * @return {string} empty when nobody did
 */
export function recommendationReason(names, message) {
    const known = names.filter(Boolean);
    if (known.length === 0) return '';
    const who = known.length === 1 ? known[0]
        : known.length === 2 ? `${known[0]} and ${known[1]}`
            : `${known[0]} and ${known.length - 1} others`;
    const words = (message || '').trim();
    return known.length === 1 && words ? `${who}: \u201c${words}\u201d` : `Swrled to you by ${who}`;
}

/**
 * What the recommendations filters know about my own copy of a swrl.
 *
 * @param {{later: boolean, done: boolean, deleted: boolean} | undefined} entry my list entry, if any
 * @return {{done: boolean, onList: boolean}} `onList` means wanted but not yet done
 */
export function myStateOfSwrl(entry) {
    if (!entry) return { done: false, onList: false };
    return { done: entry.done, onList: entry.later && !entry.done && !entry.deleted };
}

/**
 * Whether an inbox recommendation is shown. Anything that needs attention
 * (never opened, or with a reply I haven't read) always is, even when I have
 * already done the swrl or have it on my list. The rest is shown when it is
 * neither done nor on my list, or when its filter is switched on.
 *
 * @param {{unread: boolean, hasUnreadReply: boolean, done: boolean, onList: boolean}} state
 * @param {{showDone: boolean, showOnList: boolean}} filters
 * @return {boolean}
 */
export function showInboxRecommendation(state, filters) {
    if (state.unread || state.hasUnreadReply) return true;
    if (state.done) return filters.showDone;
    if (state.onList) return filters.showOnList;
    return true;
}

/**
 * The number on the inbox badge: recommendations I haven't read plus those
 * (sent or received) with a reply I haven't read, each counted once.
 *
 * @param {Object<string, Recommendation>} inbox my received recommendations by id
 * @param {Object<string, Recommendation>} sent my sent recommendations by id
 * @param {string} uid me
 * @param {Iterable<string>} unreadReplyIDs ids of recommendations with unread replies
 * @return {number}
 */
export function badgeCount(inbox, sent, uid, unreadReplyIDs) {
    const ids = new Set();
    Object.keys(inbox).forEach(id => {
        const r = inbox[id];
        if (!r.read.includes(uid) && !r.dismissed.includes(uid)) ids.add(id);
    });
    for (const id of unreadReplyIDs) {
        if (inbox[id] || sent[id]) ids.add(id);
    }
    return ids.size;
}
