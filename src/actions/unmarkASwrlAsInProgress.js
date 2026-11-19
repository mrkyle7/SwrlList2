import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * No longer started; it stays on my list.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function unmarkASwrlAsInProgress(swrl, firestore) {
   return writeListEntry(swrl, { inProgress: false }, firestore, { updated: true });
}
