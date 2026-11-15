// Pure logic for list entries, friends and the migration, kept apart from
// index.js so it can be tested without Firebase.

const COUNT_FLAGS = [['later', 'laterCount'], ['done', 'doneCount'], ['loved', 'lovedCount']];

/**
 * The change in the shared counts when a list entry is written, created or
 * deleted. A missing entry counts as all flags false.
 *
 * @param {{later?: boolean, done?: boolean, loved?: boolean} | undefined} before
 * @param {{later?: boolean, done?: boolean, loved?: boolean} | undefined} after
 * @returns {{laterCount?: number, doneCount?: number, lovedCount?: number}} only
 *          the non-zero deltas (+1 or -1); empty when nothing changed
 */
function countDeltas(before, after) {
    const deltas = {};
    for (const [flag, countField] of COUNT_FLAGS) {
        const delta = (after && after[flag] === true ? 1 : 0) - (before && before[flag] === true ? 1 : 0);
        if (delta !== 0) deltas[countField] = delta;
    }
    return deltas;
}

/**
 * Whether a friend request has just been accepted.
 *
 * @param {{status?: string} | undefined} before
 * @param {{status?: string} | undefined} after
 * @returns {boolean}
 */
function justAccepted(before, after) {
    return !!after && after.status === 'accepted' && (!before || before.status !== 'accepted');
}

/**
 * The two friend docs to write when a request is accepted, as
 * [path of the doc, data without `since`].
 *
 * @param {{from: string, to: string}} request
 * @returns {{path: string, uid: string}[]}
 */
function friendDocsFor(request) {
    return [
        { path: `swrlers/${request.from}/friends/${request.to}`, uid: request.to },
        { path: `swrlers/${request.to}/friends/${request.from}`, uid: request.from }
    ];
}

const LEGACY_ARRAYS = ['later', 'done', 'deleted', 'loved', 'isRecommended'];

/**
 * Turns a legacy swrl document (uid arrays) into one list entry per user who
 * appears in `later`, `done`, `loved` or `deleted`. `isRecommended` does not
 * make an entry. Entries carry `added` and `updated` over from the swrl doc
 * (as stored, so timestamps stay timestamps).
 *
 * @param {Object} swrl the swrl doc's data
 * @param {string} swrlID the swrl doc's id
 * @param {Object<string, string>} [defaultVisibilities] uid -> that user's defaultVisibility
 * @returns {{uid: string, data: Object}[]}
 */
function entriesFromLegacySwrl(swrl, swrlID, defaultVisibilities) {
    const defaults = defaultVisibilities || {};
    const later = swrl.later || [];
    const done = swrl.done || [];
    const loved = swrl.loved || [];
    const deleted = swrl.deleted || [];
    const uids = [...new Set([...later, ...done, ...loved, ...deleted])].filter(uid => typeof uid === 'string' && uid);
    return uids.map(uid => {
        const data = {
            swrlID: swrl.swrlID || swrlID,
            uid: uid,
            type: swrl.type,
            category: swrl.category,
            details: swrl.details,
            later: later.includes(uid),
            done: done.includes(uid),
            loved: loved.includes(uid),
            deleted: deleted.includes(uid),
            visibility: normaliseVisibility(defaults[uid]),
            visibilityOverride: false
        };
        if (swrl.added !== undefined) data.added = swrl.added;
        if (swrl.updated !== undefined) data.updated = swrl.updated;
        return { uid, data };
    });
}

/**
 * Splits entries into those whose user still has a profile and those whose
 * user does not (an account deleted before account deletion existed, still
 * named in the legacy arrays). Entries under a missing profile would be
 * orphans nobody can see or clean up, and would keep counting towards the
 * shared counts, so the migration skips them.
 *
 * @param {{uid: string, data: Object}[]} entries
 * @param {Object<string, any>} profiles uid -> anything, one key per existing swrlers doc
 * @returns {{known: {uid: string, data: Object}[], skipped: {uid: string, data: Object}[]}}
 */
function splitByProfile(entries, profiles) {
    const known = [];
    const skipped = [];
    for (const entry of entries) {
        (Object.prototype.hasOwnProperty.call(profiles, entry.uid) ? known : skipped).push(entry);
    }
    return { known, skipped };
}

/**
 * @param {string | undefined} value
 * @returns {'private' | 'friends' | 'public'} the value, or 'friends' when unknown or missing
 */
function normaliseVisibility(value) {
    return value === 'private' || value === 'public' || value === 'friends' ? value : 'friends';
}

/**
 * Adds one entry to running per-swrl totals.
 *
 * @param {Object<string, {laterCount: number, doneCount: number, lovedCount: number}>} totals mutated
 * @param {string} swrlID
 * @param {{later?: boolean, done?: boolean, loved?: boolean}} entry
 */
function addToCounts(totals, swrlID, entry) {
    const t = totals[swrlID] || (totals[swrlID] = { laterCount: 0, doneCount: 0, lovedCount: 0 });
    for (const [flag, countField] of COUNT_FLAGS) {
        if (entry[flag] === true) t[countField]++;
    }
}

/**
 * The field deletions that strip legacy arrays from a swrl doc, as the names
 * of the arrays actually present.
 *
 * @param {Object} swrl
 * @returns {string[]}
 */
function legacyArraysPresent(swrl) {
    return LEGACY_ARRAYS.filter(name => name in swrl);
}

module.exports = {
    countDeltas, justAccepted, friendDocsFor, entriesFromLegacySwrl, splitByProfile, normaliseVisibility,
    addToCounts, legacyArraysPresent, LEGACY_ARRAYS
};
