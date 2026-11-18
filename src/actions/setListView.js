import { doc, setDoc } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { getListView, setCurrentListView } from '../listeners/listEntries';
import { ListView } from '../model/listView';

/**
 * Changes how I like lists of swrls shown. The in-memory choice changes at
 * once, so the list can redraw straight away; for a signed-in user it is then
 * stored on my profile (`listView`). If that write fails the old choice comes
 * back and the promise rejects, so the caller can redraw and say so.
 * Someone not signed in keeps the choice until they leave.
 *
 * @param {ListView} view
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default async function setListView(view, firestore) {
    const previous = getListView();
    setCurrentListView(view);
    if (!swrlUser || swrlUser.isAnonymous) return;
    try {
        await setDoc(doc(firestore, Collection.SWRLERS, swrlUser.uid), { listView: view.id }, { merge: true });
    } catch (error) {
        setCurrentListView(previous);
        throw error;
    }
}
