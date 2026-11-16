// Removes everything that belongs to a deleted user. Idempotent: running it
// again for the same uid finds nothing more to do (or finishes what a failed
// run left). The planning is in accountDeletion.js.

const {
    MAX_BATCH_WRITES, chunk, planRecommendation, friendMirrorPaths, legacyFieldsBySwrl, summaryLine
} = require('./accountDeletion');
const { LEGACY_ARRAYS } = require('./listEntries');

/**
 * @typedef {(batch: import('firebase-admin/firestore').WriteBatch) => void} BatchOp
 */

/**
 * Commits operations in batches of at most MAX_BATCH_WRITES writes.
 *
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {BatchOp[]} ops one write each
 * @returns {Promise<void>}
 */
async function commitInBatches(db, ops) {
    for (const group of chunk(ops, MAX_BATCH_WRITES)) {
        const batch = db.batch();
        group.forEach(op => op(batch));
        await batch.commit();
    }
}

/**
 * Deletes a user's data from Firestore, using the admin SDK:
 *
 * - their friends' mirror docs (explicitly, as well as through `friendRemoved`)
 * - friend requests sent or received
 * - messaging tokens and saved searches
 * - recommendations they sent (and the id on the shared swrl) and their
 *   place among the receivers of others
 * - their uid in the legacy arrays on `swrls`
 * - last, `swrlers/{uid}` and everything under it (list entries, friends,
 *   private comments). Deleting the entries fires `listEntryCounts`, which
 *   brings the shared counts down.
 *
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {typeof import('firebase-admin/firestore').FieldValue} FieldValue
 * @param {string} uid
 * @returns {Promise<Object<string, number>>} what was removed
 */
async function deleteUserData(db, FieldValue, uid) {
    if (!uid) throw new Error('deleteUserData needs a uid');
    const counts = {};

    // friends: the other side's mirror doc
    const friendsSnapshot = await db.collection(`swrlers/${uid}/friends`).get();
    const mirrors = friendMirrorPaths(uid, friendsSnapshot.docs.map(friend => friend.id));
    await commitInBatches(db, mirrors.map(path => batch => batch.delete(db.doc(path))));
    counts['friend links'] = mirrors.length;

    // requests in either direction
    const requestRefs = new Map();
    for (const field of ['from', 'to']) {
        const found = await db.collection('friendRequests').where(field, '==', uid).get();
        found.forEach(request => requestRefs.set(request.id, request.ref));
    }
    await commitInBatches(db, [...requestRefs.values()].map(ref => batch => batch.delete(ref)));
    counts['friend requests'] = requestRefs.size;

    // devices, saved searches and links shared outside the app
    for (const [collection, name, field] of [['messagingtokens', 'messaging tokens', 'uid'], ['savedsearches', 'saved searches', 'uid'], ['shares', 'shared links', 'from']]) {
        const found = await db.collection(collection).where(field, '==', uid).get();
        await commitInBatches(db, found.docs.map(item => batch => batch.delete(item.ref)));
        counts[name] = found.size;
    }

    // recommendations: sent ones go, received ones lose this receiver
    const recommendations = new Map();
    const sent = await db.collection('recommendations').where('from', '==', uid).get();
    sent.forEach(item => recommendations.set(item.id, item));
    const received = await db.collection('recommendations').where('to', 'array-contains', uid).get();
    received.forEach(item => recommendations.set(item.id, item));
    /** @type {BatchOp[]} */
    const recommendationOps = [];
    /** @type {Map<string, string[]>} swrlID -> ids of deleted recommendations */
    const idsToRemoveFromSwrls = new Map();
    let deletedRecommendations = 0;
    let updatedRecommendations = 0;
    for (const [id, item] of recommendations) {
        const data = item.data();
        const plan = planRecommendation(data, uid);
        if (plan.action === 'delete') {
            recommendationOps.push(batch => batch.delete(item.ref));
            deletedRecommendations++;
            if (data.swrlID && plan.removeFromSwrl) {
                idsToRemoveFromSwrls.set(data.swrlID, [...(idsToRemoveFromSwrls.get(data.swrlID) || []), id]);
            }
        } else if (plan.action === 'update') {
            recommendationOps.push(batch => batch.update(item.ref, plan.fields));
            updatedRecommendations++;
        }
    }
    // only swrls that still exist: an update of a missing doc would fail the batch
    const swrlRefs = [...idsToRemoveFromSwrls.keys()].map(swrlID => db.collection('swrls').doc(swrlID));
    const existingSwrls = swrlRefs.length > 0 ? await db.getAll(...swrlRefs) : [];
    existingSwrls.filter(swrl => swrl.exists).forEach(swrl => {
        recommendationOps.push(batch => batch.update(swrl.ref,
            { recommendations: FieldValue.arrayRemove(...idsToRemoveFromSwrls.get(swrl.id)) }));
    });
    await commitInBatches(db, recommendationOps);
    counts['recommendations deleted'] = deletedRecommendations;
    counts['recommendations left'] = updatedRecommendations;

    // legacy uid arrays that are still on old swrl docs
    const legacyResults = [];
    for (const field of LEGACY_ARRAYS) {
        const found = await db.collection('swrls').where(field, 'array-contains', uid).get();
        legacyResults.push({ field, swrlIDs: found.docs.map(item => item.id) });
    }
    const legacy = legacyFieldsBySwrl(legacyResults);
    await commitInBatches(db, [...legacy].map(([swrlID, fields]) => batch => {
        const update = {};
        fields.forEach(field => update[field] = FieldValue.arrayRemove(uid));
        batch.update(db.collection('swrls').doc(swrlID), update);
    }));
    counts['legacy swrl docs'] = legacy.size;

    // last: the profile and everything under it
    try {
        // only for the log line; never let it stop the delete
        const entries = await db.collection(`swrlers/${uid}/listEntries`).count().get();
        counts['list entries'] = entries.data().count;
    } catch (error) {
        console.warn(`could not count the list entries of ${uid}: ${error.message}`);
    }
    await db.recursiveDelete(db.doc(`swrlers/${uid}`));

    console.log(summaryLine(uid, counts));
    return counts;
}

module.exports = { deleteUserData, commitInBatches };
