var firebase = require("firebase/app");
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';

/**
* @param {firebase.firestore.Firestore} firestore 
*/
export default function addSwrlToList(swrl, firestore) {
   swrl.added = firebase.firestore.FieldValue.serverTimestamp();
   swrl.later = firebase.firestore.FieldValue.arrayUnion(swrlUser.uid);
   swrl.done = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   swrl.deleted = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   return firestore.collection(Collection.SWRLS).doc(swrl.swrlID).set(swrl, { merge: true });
}