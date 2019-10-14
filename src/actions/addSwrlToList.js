var firebase = require("firebase/app");
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {firebase.firestore.Firestore} firestore
 * @param {Swrl} swrl
 */
export default function addSwrlToList(swrl, firestore) {
   const firestoreData = swrl.toPartialFireStoreData();
   firestoreData.added = firebase.firestore.FieldValue.serverTimestamp();
   firestoreData.later = firebase.firestore.FieldValue.arrayUnion(swrlUser.uid);
   firestoreData.done = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   firestoreData.deleted = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   return firestore.collection(Collection.SWRLS).doc(firestoreData.swrlID).set(firestoreData, { merge: true });
}