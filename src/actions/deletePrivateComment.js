import { deleteDoc, doc } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { privateCommentsPath } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {Swrl} swrl
 * @param {string} commentID
 * @param {import('firebase/firestore').Firestore} firestore
 */
export default function deletePrivateComment(swrl, commentID, firestore) {
    const [first, ...rest] = privateCommentsPath(swrlUser.uid, swrl.swrlID);
    return deleteDoc(doc(firestore, first, ...rest, commentID));
}
