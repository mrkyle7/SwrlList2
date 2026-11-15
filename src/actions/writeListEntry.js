import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { Collection, listEntryPath } from '../constants/Collection';
import { getDefaultVisibility, getListEntry, whenListEntriesReady } from '../listeners/listEntries';
import { buildEntryWrite, buildSharedSwrlWrite } from '../model/listEntryWrite';
import { Swrl } from '../model/swrl';

/**
 * The one write every list action makes: set flags on the signed-in user's
 * own entry (swrlers/{uid}/listEntries/{swrlID}) and refresh the shared swrl
 * document's details (no uid arrays, no counts) in the same batch.
 *
 * Waits for the own-entries cache first, so it knows whether the entry is new
 * (then `added` and the default visibility are set) and which default
 * visibility applies.
 *
 * @param {Swrl} swrl
 * @param {import('../model/listEntryWrite').EntryFlags} flags
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {{added?: boolean, updated?: boolean}} sharedTimes timestamps to refresh on the shared doc
 * @return {Promise<void>}
 */
export async function writeListEntry(swrl, flags, firestore, sharedTimes) {
    if (!swrlUser) {
        throw new Error('Not signed in');
    }
    await whenListEntriesReady();
    const uid = swrlUser.uid;
    const serverTime = serverTimestamp();
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, listEntryPath(uid, swrl.swrlID).join('/')),
        buildEntryWrite(swrl, uid, flags, getListEntry(swrl.swrlID) !== undefined, getDefaultVisibility(), serverTime),
        { merge: true });
    batch.set(doc(firestore, Collection.SWRLS, swrl.swrlID),
        buildSharedSwrlWrite(swrl, sharedTimes, serverTime),
        { merge: true });
    return batch.commit();
}
