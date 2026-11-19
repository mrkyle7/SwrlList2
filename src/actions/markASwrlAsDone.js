import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * Marks a swrl as done (and off my list).
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function markASwrlAsDone(swrl, firestore) {
   return writeListEntry(swrl, { later: false, inProgress: false, done: true, deleted: false }, firestore, { updated: true });
}
