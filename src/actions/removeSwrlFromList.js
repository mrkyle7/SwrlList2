import { doc, setDoc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {Swrl} swrl
 */
export default function removeSwrlFromList(swrl, firestore) {
   const firestoreData = swrl.toPartialFireStoreData();
   firestoreData.updated = serverTimestamp();
   firestoreData.later = arrayRemove(swrlUser.uid);
   return setDoc(doc(firestore, Collection.SWRLS, firestoreData.swrlID), firestoreData, { merge: true });
}