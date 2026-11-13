import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { privateCommentsPath } from '../constants/Collection';
import { PrivateComment } from '../model/privateComment';

/**
 * Watches the signed-in user's private comments on one Swrl, oldest first.
 *
 * @param {string} swrlID
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {(comments: PrivateComment[]) => void} onChange
 * @param {(error: Error) => void} onError
 * @return {() => void} call to stop watching
 */
export function listenToPrivateComments(swrlID, firestore, onChange, onError) {
    const [first, ...rest] = privateCommentsPath(swrlUser.uid, swrlID);
    return onSnapshot(query(collection(firestore, first, ...rest), orderBy('created')),
        // A comment just written has no server time yet; estimating it keeps
        // the new comment in the list, in order, straight away.
        querySnapshot => onChange(querySnapshot.docs.map(docSnapshot =>
            PrivateComment.fromFirestore(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })))),
        onError);
}
