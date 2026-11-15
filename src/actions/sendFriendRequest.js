import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Collection, friendRequestId } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { getIncomingRequests } from '../listeners/friends';
import acceptFriendRequest from './acceptFriendRequest';

/**
 * Asks someone to be my friend. When they already asked me (known from the
 * incoming requests cache) their request is accepted instead, so there are
 * never two requests between the same pair. The document has exactly the
 * keys the rules require.
 *
 * @param {string} toUid
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function sendFriendRequest(toUid, firestore) {
    if (getIncomingRequests().some(request => request.from === toUid)) {
        return acceptFriendRequest(toUid, firestore);
    }
    const me = swrlUser.uid;
    return setDoc(doc(firestore, Collection.FRIENDREQUESTS, friendRequestId(me, toUid)), {
        from: me,
        to: toUid,
        created: serverTimestamp(),
        status: 'pending'
    });
}
