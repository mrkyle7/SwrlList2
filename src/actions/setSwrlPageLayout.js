import { doc, setDoc } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { setCurrentPageLayout } from '../listeners/listEntries';
import { PageLayout } from '../model/swrlPage';

/**
 * Changes how I like the swrl page laid out: stores it on my profile
 * (`swrlPageLayout`) and updates the in-memory choice once it is saved, so a
 * failed write leaves the page as it was.
 *
 * @param {PageLayout} layout
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default async function setSwrlPageLayout(layout, firestore) {
    if (!swrlUser) {
        throw new Error('Not signed in');
    }
    await setDoc(doc(firestore, Collection.SWRLERS, swrlUser.uid),
        { swrlPageLayout: layout.id }, { merge: true });
    setCurrentPageLayout(layout);
}
