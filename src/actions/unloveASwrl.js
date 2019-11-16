var firebase = require("firebase/app");
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { Swrl } from '../model/swrl';

/**
 * @param {firebase.firestore.Firestore} firestore
 * @param {Swrl} swrl
 */
export default function unloveASwrl(swrl, firestore) {
   const fireStoreData = swrl.toPartialFireStoreData();
   fireStoreData.loved = firebase.firestore.FieldValue.arrayRemove(swrlUser.uid);
   return firestore.collection(Collection.SWRLS).doc(fireStoreData.swrlID).set(fireStoreData, { merge: true });
}