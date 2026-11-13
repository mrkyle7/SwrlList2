import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { privateCommentsPath } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {Swrl} swrl
 * @param {string} text already cleaned (see PrivateComment.clean)
 * @param {import('firebase/firestore').Firestore} firestore
 */
export default function addPrivateComment(swrl, text, firestore) {
    const [first, ...rest] = privateCommentsPath(swrlUser.uid, swrl.swrlID);
    return addDoc(collection(firestore, first, ...rest), {
        text: text,
        created: serverTimestamp()
    });
}
