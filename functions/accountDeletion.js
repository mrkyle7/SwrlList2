// Pure planning logic for deleting a user's data when their account goes.
// Kept apart from index.js and deleteUserData.js so it can be tested without
// Firebase.

const { LEGACY_ARRAYS } = require('./listEntries');

/** Firestore allows 500 writes per batch; stay clear of it. */
const MAX_BATCH_WRITES = 400;

/**
 * @template T
 * @param {T[]} items
 * @param {number} [size]
 * @returns {T[][]} consecutive slices of at most `size` items
 */
function chunk(items, size = MAX_BATCH_WRITES) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

/**
 * What to do with a recommendation document when `uid` is deleted.
 *
 * - sent by the user: delete it
 * - received by the user: take them out of `to` (and out of `read` and
 *   `dismissed` when those exist); delete it when nobody is left in `to`
 * - neither: leave it alone
 *
 * `removeFromSwrl` says the recommendation's id must also come off the shared
 * swrl's `recommendations` array, which is the case whenever the doc is deleted.
 *
 * @param {{from?: string, to?: string[], read?: string[], dismissed?: string[]}} recommendation
 * @param {string} uid
 * @returns {{action: 'delete' | 'update' | 'none', removeFromSwrl?: boolean, fields?: Object<string, string[]>}}
 */
function planRecommendation(recommendation, uid) {
    const to = Array.isArray(recommendation.to) ? recommendation.to : [];
    if (recommendation.from === uid) {
        return { action: 'delete', removeFromSwrl: true };
    }
    if (!to.includes(uid)) {
        return { action: 'none' };
    }
    const remaining = to.filter(receiver => receiver !== uid);
    if (remaining.length === 0) {
        return { action: 'delete', removeFromSwrl: true };
    }
    const fields = { to: remaining };
    for (const field of ['read', 'dismissed']) {
        const values = recommendation[field];
        if (Array.isArray(values) && values.includes(uid)) {
            fields[field] = values.filter(value => value !== uid);
        }
    }
    return { action: 'update', fields };
}

/**
 * The mirror friend docs to delete: `swrlers/{friend}/friends/{uid}` for each
 * of the user's own friends docs.
 *
 * @param {string} uid
 * @param {string[]} friendUids ids of the docs in swrlers/{uid}/friends
 * @returns {string[]} document paths
 */
function friendMirrorPaths(uid, friendUids) {
    return [...new Set(friendUids)]
        .filter(friendUid => friendUid && friendUid !== uid)
        .map(friendUid => `swrlers/${friendUid}/friends/${uid}`);
}

/**
 * Groups the results of the legacy-array queries per swrl, so each swrl doc is
 * updated once.
 *
 * @param {{field: string, swrlIDs: string[]}[]} results one per array field queried
 * @returns {Map<string, string[]>} swrlID -> the array fields to remove the uid from
 */
function legacyFieldsBySwrl(results) {
    const bySwrl = new Map();
    for (const { field, swrlIDs } of results) {
        if (!LEGACY_ARRAYS.includes(field)) continue;
        for (const swrlID of swrlIDs) {
            const fields = bySwrl.get(swrlID) || [];
            if (!fields.includes(field)) fields.push(field);
            bySwrl.set(swrlID, fields);
        }
    }
    return bySwrl;
}

/**
 * @param {string} uid
 * @param {Object<string, number>} counts what was removed, by name
 * @returns {string} one log line
 */
function summaryLine(uid, counts) {
    const parts = Object.entries(counts).map(([name, count]) => `${count} ${name}`);
    return `deleted data of user ${uid}: ${parts.join(', ')}`;
}

module.exports = {
    MAX_BATCH_WRITES, chunk, planRecommendation, friendMirrorPaths, legacyFieldsBySwrl, summaryLine
};
