import { deleteDoc, doc } from 'firebase/firestore';
import { Collection, friendRequestId } from '../constants/Collection';
import { swrlUser } from '../firebase/login';

/**
 * Cancels (deletes) a request I sent.
 *
 * @param {string} toUid
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function cancelFriendRequest(toUid, firestore) {
    return deleteDoc(doc(firestore, Collection.FRIENDREQUESTS, friendRequestId(swrlUser.uid, toUid)));
}
