import { doc, updateDoc } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { privateCommentsPath } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {Swrl} swrl
 * @param {string} commentID
 * @param {string} text already cleaned (see PrivateComment.clean)
 * @param {import('firebase/firestore').Firestore} firestore
 */
export default function editPrivateComment(swrl, commentID, text, firestore) {
    const [first, ...rest] = privateCommentsPath(swrlUser.uid, swrl.swrlID);
    return updateDoc(doc(firestore, first, ...rest, commentID), { text: text });
}
