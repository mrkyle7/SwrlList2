import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * Marks a swrl as started (watching, reading, ...): on my list, not done.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function markASwrlAsInProgress(swrl, firestore) {
   return writeListEntry(swrl, { later: true, inProgress: true, done: false, deleted: false }, firestore, { updated: true });
}
