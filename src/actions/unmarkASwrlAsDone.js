import { doc, setDoc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {Swrl} swrl
 */
export default function unmarkASwrlAsDone(swrl, firestore) {
   const fireStoreData = swrl.toPartialFireStoreData();
   fireStoreData.updated = serverTimestamp();
   fireStoreData.done = arrayRemove(swrlUser.uid);
   return setDoc(doc(firestore, Collection.SWRLS, fireStoreData.swrlID), fireStoreData, { merge: true });
}