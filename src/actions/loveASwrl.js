var firebase = require("firebase/app");
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';

/**
* @param {firebase.firestore.Firestore} firestore 
*/
export default function loveASwrl(swrl, firestore) {
   swrl.updated = firebase.firestore.FieldValue.serverTimestamp();
   swrl.loved = firebase.firestore.FieldValue.arrayUnion(swrlUser.uid);
   return firestore.collection(Collection.SWRLS).doc(swrl.swrlID).set(swrl, { merge: true });
}