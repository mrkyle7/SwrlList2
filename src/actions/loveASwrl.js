var firebase = require("firebase/app");
import { swrlUser } from '../firebase/login';

/**
* @param {firebase.firestore.Firestore} firestore 
*/
export default function loveASwrl(swrl, firestore) {
   swrl.updated = firebase.firestore.FieldValue.serverTimestamp();
   swrl.loved = firebase.firestore.FieldValue.arrayUnion(swrlUser.uid);
   return firestore.collection('swrls').doc(swrl.swrlID).set(swrl, { merge: true });
}