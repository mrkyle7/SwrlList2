import { doc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {Swrl} swrl
 */
export default function loveASwrl(swrl, firestore) {
   const fireStoreData = swrl.toPartialFireStoreData()
   fireStoreData.updated = serverTimestamp();
   fireStoreData.loved = arrayUnion(swrlUser.uid);
   return setDoc(doc(firestore, Collection.SWRLS, fireStoreData.swrlID), fireStoreData, { merge: true });
}