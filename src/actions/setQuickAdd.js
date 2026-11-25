import { doc, setDoc } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { setCurrentQuickAdd } from '../listeners/listEntries';
import { QuickAddMode } from '../model/quickAdd';

/**
 * Changes what my search button does: stores it on my profile
 * (`quickAddButton`) and updates the in-memory choice once it is saved.
 *
 * @param {QuickAddMode} mode
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default async function setQuickAdd(mode, firestore) {
    if (!swrlUser) throw new Error('Not signed in');
    await setDoc(doc(firestore, Collection.SWRLERS, swrlUser.uid), { quickAddButton: mode.id }, { merge: true });
    setCurrentQuickAdd(mode);
}
