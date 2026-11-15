import { writeListEntry } from './writeListEntry';
import { Swrl } from '../model/swrl';

/**
 * Unloves a swrl.
 *
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<void>}
 */
export default function unloveASwrl(swrl, firestore) {
   return writeListEntry(swrl, { loved: false }, firestore, {});
}
