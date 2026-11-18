/** Longest reply text accepted (also enforced by firestore.rules). */
export const MAX_REPLY_LENGTH = 1000;

/**
 * One message in the conversation between the sender of a recommendation and
 * ONE of its receivers. `thread` is that receiver's uid, so a recommendation
 * sent to several people has one private thread per receiver.
 */
export class RecommendationReply {
    /**
     * @param {string} id
     * @param {string} from uid of whoever wrote it (the sender or the thread's receiver)
     * @param {string} thread uid of the receiver this conversation is with
     * @param {string} text
     * @param {Date} created
     */
    constructor(id, from, thread, text, created) {
        this.id = id;
        this.from = from;
        this.thread = thread;
        this.text = text;
        this.created = created;
    }

    /**
     * @param {import('firebase/firestore').QueryDocumentSnapshot} docSnapshot
     * @return {RecommendationReply}
     */
    static fromFirestore(docSnapshot) {
        const data = docSnapshot.data({ serverTimestamps: 'estimate' });
        return new RecommendationReply(docSnapshot.id, data.from, data.thread, data.text,
            data.created ? data.created.toDate() : new Date());
    }
}

/**
 * The trimmed text of a reply, or undefined when it is empty or too long.
 *
 * @param {string} text
 * @return {string | undefined}
 */
export function cleanReplyText(text) {
    const trimmed = (text || '').trim();
    return trimmed.length > 0 && trimmed.length <= MAX_REPLY_LENGTH ? trimmed : undefined;
}

/**
 * Groups replies into one conversation per receiver, each oldest first.
 *
 * @param {RecommendationReply[]} replies
 * @return {Object<string, RecommendationReply[]>} keyed by the receiver's uid
 */
export function repliesByThread(replies) {
    /** @type {Object<string, RecommendationReply[]>} */
    const threads = {};
    [...replies]
        .sort((a, b) => a.created.getTime() - b.created.getTime())
        .forEach(reply => {
            (threads[reply.thread] = threads[reply.thread] || []).push(reply);
        });
    return threads;
}

/**
 * The receivers whose conversation the viewer may see, and so where they may
 * write: the sender sees every receiver's, a receiver only their own.
 *
 * @param {{from: string, to: string[]}} recommendation
 * @param {string} viewerUid
 * @return {string[]} receiver uids, empty when the viewer is not part of it
 */
export function threadsVisibleTo(recommendation, viewerUid) {
    if (recommendation.from === viewerUid) return [...recommendation.to];
    return recommendation.to.includes(viewerUid) ? [viewerUid] : [];
}
