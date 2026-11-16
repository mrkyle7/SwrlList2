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
