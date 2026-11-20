import { doc, setDoc } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { setCurrentHomeLayout } from '../listeners/listEntries';
import { HomeLayout } from '../model/homeLayout';

/**
 * Changes how I like the home screen on phones: stores it on my profile
 * (`homeLayout`) and updates the in-memory choice once it is saved, so a
 * failed write leaves the home screen as it was.
 *
 * @param {HomeLayout} layout
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default async function setHomeLayout(layout, firestore) {
    if (!swrlUser) {
        throw new Error('Not signed in');
    }
    await setDoc(doc(firestore, Collection.SWRLERS, swrlUser.uid),
        { homeLayout: layout.id }, { merge: true });
    setCurrentHomeLayout(layout);
}
