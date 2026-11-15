import { deleteDoc, doc } from 'firebase/firestore';
import { friendsPath } from '../constants/Collection';
import { swrlUser } from '../firebase/login';

/**
 * Unfriends someone by deleting my side; the `friendRemoved` Cloud Function
 * deletes theirs.
 *
 * @param {string} friendUid
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function removeFriend(friendUid, firestore) {
    return deleteDoc(doc(firestore, [...friendsPath(swrlUser.uid), friendUid].join('/')));
}
