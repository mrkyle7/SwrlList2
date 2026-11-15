import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * Loves a swrl.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function loveASwrl(swrl, firestore) {
   return writeListEntry(swrl, { loved: true }, firestore, { updated: true });
}
