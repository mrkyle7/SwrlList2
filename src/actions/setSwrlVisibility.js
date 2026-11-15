import { doc, updateDoc } from 'firebase/firestore';
import { listEntryPath } from '../constants/Collection';
import { Visibility } from '../constants/Visibility';
import { swrlUser } from '../firebase/login';
import { getDefaultVisibility, whenListEntriesReady } from '../listeners/listEntries';
import { entryVisibilityData } from '../model/visibilitySettings';

/**
 * Sets who can see one of my swrls. A specific visibility is stored with
 * `visibilityOverride: true`; 'default' follows my default visibility
 * (`visibilityOverride: false`, `visibility` = the default now). Does not
 * touch `updated`, so the swrl keeps its place in my lists. The entry must
 * exist (the swrl is on one of my lists).
 *
 * @param {string} swrlID
 * @param {Visibility | 'default'} visibilityOrDefault
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default async function setSwrlVisibility(swrlID, visibilityOrDefault, firestore) {
    if (!swrlUser) {
        throw new Error('Not signed in');
    }
    await whenListEntriesReady();
    return updateDoc(doc(firestore, listEntryPath(swrlUser.uid, swrlID).join('/')),
        entryVisibilityData(visibilityOrDefault, getDefaultVisibility()));
}
