import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * Dismisses a swrl from Discover: off my list, not done, deleted.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function deleteSwrl(swrl, firestore) {
   return writeListEntry(swrl, { later: false, done: false, deleted: true }, firestore, {});
}
