import { doc, setDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {Swrl} swrl
 */
export default function addSwrlToList(swrl, firestore) {
   const firestoreData = swrl.toPartialFireStoreData();
   firestoreData.added = serverTimestamp();
   firestoreData.updated = serverTimestamp();
   firestoreData.later = arrayUnion(swrlUser.uid);
   firestoreData.done = arrayRemove(swrlUser.uid);
   firestoreData.deleted = arrayRemove(swrlUser.uid);
   return setDoc(doc(firestore, Collection.SWRLS, firestoreData.swrlID), firestoreData, { merge: true });
}