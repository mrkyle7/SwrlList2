import { Swrl } from './swrl';
import { Visibility } from '../constants/Visibility';

/**
 * Which of the four flags an action sets. Anything left out is not written on
 * an existing entry (merge) and is false on a new one.
 *
 * @typedef {{later?: boolean, inProgress?: boolean, done?: boolean, loved?: boolean, deleted?: boolean}} EntryFlags
 */

/**
 * The data for one merge write of the signed-in user's entry for a swrl.
 * Pure: the caller passes `serverTimestamp()` as `serverTime`, and says
 * whether the entry exists already (from the own-entries cache).
 *
 * - Always: swrlID, uid, type, category, details, the given flags, `updated`.
 * - Only for a new entry: `added`, all the flags (false unless given),
 *   `visibility` = the user's default and `visibilityOverride: false`.
 * - An existing entry keeps its `added`, `visibility` and `visibilityOverride`.
 *
 * @param {Swrl} swrl
 * @param {string} uid
 * @param {EntryFlags} flags
 * @param {boolean} entryExists
 * @param {Visibility} defaultVisibility
 * @param {any} serverTime normally serverTimestamp()
 * @return {Object}
 */
export function buildEntryWrite(swrl, uid, flags, entryExists, defaultVisibility, serverTime) {
    const data = {
        swrlID: swrl.swrlID,
        uid: uid,
        type: swrl.type.id,
        category: swrl.category.id,
        details: swrl.details.toJSON(),
        updated: serverTime
    };
    if (!entryExists) {
        Object.assign(data, {
            later: false, inProgress: false, done: false, loved: false, deleted: false,
            added: serverTime,
            visibility: defaultVisibility.id,
            visibilityOverride: false
        });
    }
    return Object.assign(data, flags);
}

/**
 * The data for the write that creates or refreshes the shared swrl document:
 * its details, plus `added` and/or `updated` when asked. Never uid arrays or
 * count fields; the rules refuse those from clients.
 *
 * @param {Swrl} swrl
 * @param {{added?: boolean, updated?: boolean}} times
 * @param {any} serverTime normally serverTimestamp()
 * @return {Object}
 */
export function buildSharedSwrlWrite(swrl, times, serverTime) {
    const data = swrl.toPartialFireStoreData();
    if (times.added) data.added = serverTime;
    if (times.updated) data.updated = serverTime;
    return data;
}
