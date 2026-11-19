import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * Takes a swrl off my list.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function removeSwrlFromList(swrl, firestore) {
   return writeListEntry(swrl, { later: false, inProgress: false }, firestore, { updated: true });
}
