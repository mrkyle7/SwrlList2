import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * Unmarks a swrl as done.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function unmarkASwrlAsDone(swrl, firestore) {
   return writeListEntry(swrl, { done: false }, firestore, { updated: true });
}
