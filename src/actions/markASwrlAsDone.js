var firebase = require("firebase/app");
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {firebase.firestore.Firestore} firestore
 * @param {Swrl} swrl
 */
export default function markASwrlAsDone(swrl, firestore) {
   const fireStoreData = swrl.toPartialFireStoreData();
   fireStoreData.updated = firebase.firestore.FieldValue.serverTimestamp();
   fireStoreData.later = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   fireStoreData.done = firebase.firestore.FieldValue.arrayUnion(swrlUser.uid);
   fireStoreData.deleted = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   return firestore.collection(Collection.SWRLS).doc(fireStoreData.swrlID).set(fireStoreData, { merge: true });
}