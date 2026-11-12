import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {Swrl} swrl
 */
export default function deleteSwrl(swrl, firestore) {
   const firestoreData = swrl.toPartialFireStoreData();
   firestoreData.later = arrayRemove(swrlUser.uid);
   firestoreData.done = arrayRemove(swrlUser.uid);
   firestoreData.deleted = arrayUnion(swrlUser.uid);
   return setDoc(doc(firestore, Collection.SWRLS, firestoreData.swrlID), firestoreData, { merge: true });
}