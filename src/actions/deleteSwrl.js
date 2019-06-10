var firebase = require("firebase/app");
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';

/**
* @param {firebase.firestore.Firestore} firestore 
*/
export default function deleteSwrl(swrl, firestore) {
   swrl.updated = firebase.firestore.FieldValue.serverTimestamp();
   swrl.later = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   swrl.done = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   swrl.deleted = firebase.firestore.FieldValue.arrayUnion(swrlUser.uid);
   return firestore.collection(Collection.SWRLS).doc(swrl.swrlID).set(swrl, { merge: true });
}