import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { listEntryPath } from '../constants/Collection';
import { genreChanges } from '../model/myGenres';

/**
 * Saves the genres (cuisines) I want for a swrl on my list, as changes from
 * its source's genres (model/myGenres.js), on my own entry only.
 *
 * @param {string} swrlID
 * @param {string[]} base the swrl's own genres
 * @param {string[]} wanted the genres I want shown
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default async function setMyGenres(swrlID, base, wanted, firestore) {
    if (!swrlUser) throw new Error('Not signed in');
    await setDoc(doc(firestore, listEntryPath(swrlUser.uid, swrlID).join('/')),
        { ...genreChanges(base, wanted), updated: serverTimestamp() }, { merge: true });
}
