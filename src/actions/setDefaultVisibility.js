import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { Collection, listEntryPath } from '../constants/Collection';
import { Visibility } from '../constants/Visibility';
import { swrlUser } from '../firebase/login';
import {
    getAllListEntries, getDefaultVisibility, setCurrentDefaultVisibility, whenListEntriesReady
} from '../listeners/listEntries';
import { chunk, entriesToRewrite, writeOrder } from '../model/visibilitySettings';

/**
 * Changes my default visibility: stores it on my profile and rewrites
 * `visibility` on every entry of mine that follows the default
 * (`visibilityOverride == false`), in batches. The entries' `updated` is not
 * touched, so the order of my lists does not change.
 *
 * The order of the writes depends on the direction (see `writeOrder`): going
 * more private rewrites the entries before the profile, going less private
 * writes the profile first. Either way a failure part way never leaves
 * anything more visible than the new setting, and calling this again with the
 * same value finishes the job (only entries not yet at the target are
 * rewritten). The in-memory default is updated once everything is written.
 *
 * @param {Visibility} visibility the new default
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default async function setDefaultVisibility(visibility, firestore) {
    if (!swrlUser) {
        throw new Error('Not signed in');
    }
    await whenListEntriesReady();
    const uid = swrlUser.uid;
    const writeProfile = () => setDoc(doc(firestore, Collection.SWRLERS, uid),
        { defaultVisibility: visibility.id }, { merge: true });
    const writeEntries = async () => {
        const swrlIDs = entriesToRewrite(getAllListEntries(), visibility);
        for (const ids of chunk(swrlIDs)) {
            const batch = writeBatch(firestore);
            ids.forEach(swrlID => batch.update(doc(firestore, listEntryPath(uid, swrlID).join('/')),
                { visibility: visibility.id }));
            await batch.commit();
        }
    };

    if (writeOrder(getDefaultVisibility(), visibility) === 'entriesFirst') {
        await writeEntries();
        await writeProfile();
    } else {
        await writeProfile();
        await writeEntries();
    }
    setCurrentDefaultVisibility(visibility);
}
