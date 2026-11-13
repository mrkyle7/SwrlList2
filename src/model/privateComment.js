export const MAX_PRIVATE_COMMENT_LENGTH = 2000;

/**
 * A note a user has written about a Swrl, visible only to them.
 */
export class PrivateComment {
    /**
     * @param {string} id
     * @param {string} text
     * @param {Date} [created] undefined until the server has set the time
     */
    constructor(id, text, created) {
        this.id = id;
        this.text = text;
        this.created = created;
    }

    /**
     * @param {string} id
     * @param {Object} data
     * @return {PrivateComment}
     */
    static fromFirestore(id, data) {
        return new PrivateComment(id, data.text || '',
            data.created !== undefined && data.created !== null ? data.created.toDate() : undefined);
    }

    /**
     * What the user typed, as it will be stored: trimmed, and undefined if
     * there is nothing left or it is too long.
     *
     * @param {string} input
     * @return {string | undefined}
     */
    static clean(input) {
        const text = (input || '').trim();
        return text.length > 0 && text.length <= MAX_PRIVATE_COMMENT_LENGTH ? text : undefined;
    }
}
