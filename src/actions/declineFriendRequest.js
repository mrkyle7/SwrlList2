import { deleteDoc, doc } from 'firebase/firestore';
import { Collection, friendRequestId } from '../constants/Collection';
import { swrlUser } from '../firebase/login';

/**
 * Declines (deletes) the request a user sent me.
 *
 * @param {string} fromUid
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function declineFriendRequest(fromUid, firestore) {
    return deleteDoc(doc(firestore, Collection.FRIENDREQUESTS, friendRequestId(fromUid, swrlUser.uid)));
}
