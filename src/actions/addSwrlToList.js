var firebase = require("firebase/app");
import { swrlUser } from '../firebase/login';

/**
* @param {firebase.firestore.Firestore} firestore 
*/
export default function addSwrlToList(swrl, firestore) {
   swrl.added = firebase.firestore.FieldValue.serverTimestamp();
   swrl.later = firebase.firestore.FieldValue.arrayUnion(swrlUser.uid);
   return firestore.collection('swrls').doc(swrl.swrlID).set(swrl, { merge: true });
}