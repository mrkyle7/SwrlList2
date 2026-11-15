import { doc, updateDoc } from 'firebase/firestore';
import { Collection, friendRequestId } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { markAccepting } from '../listeners/friends';

/**
 * Accepts the request a user sent me. Only `status` changes; a Cloud Function
 * then writes the friends docs on both sides and deletes the request.
 *
 * @param {string} fromUid
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function acceptFriendRequest(fromUid, firestore) {
    markAccepting(fromUid);
    return updateDoc(doc(firestore, Collection.FRIENDREQUESTS, friendRequestId(fromUid, swrlUser.uid)),
        { status: 'accepted' });
}
