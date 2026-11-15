import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * Puts a swrl on my list.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function addSwrlToList(swrl, firestore) {
   return writeListEntry(swrl, { later: true, done: false, deleted: false }, firestore, { added: true, updated: true });
}
