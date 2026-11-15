import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { labelsPath } from '../constants/Collection';

/**
 * Replaces my private labels on one swrl. An empty list removes the doc.
 *
 * @param {string} swrlID
 * @param {string[]} labels already cleaned (see model/labels)
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function setSwrlLabels(swrlID, labels, firestore) {
    const ref = doc(firestore, [...labelsPath(swrlUser.uid), swrlID].join('/'));
    if (labels.length === 0) {
        return deleteDoc(ref);
    }
    return setDoc(ref, { labels: labels, updated: serverTimestamp() });
}
