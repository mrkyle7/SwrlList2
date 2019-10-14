const firebase = require("firebase/app");
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { Recommendation } from '../model/recommendation';

/**
 * 
 * @param {HTMLElement} recommendationDiv 
 * @param {Recommendation} recommendation 
 * @param {firebase.firestore.Firestore} firestore 
 */
export const markRecommendationAsRead = (recommendationDiv, recommendation, firestore) => {
    firestore.collection(Collection.RECOMMENDATIONS).doc(recommendation.id).set({
        read: firebase.firestore.FieldValue.arrayUnion(swrlUser.uid)
    }, { merge: true });
    if (recommendationDiv) {
        recommendationDiv.classList.remove('unread');
        recommendationDiv.querySelector('.markRead').classList.add('hidden');
        recommendationDiv.querySelector('.markUnRead').classList.remove('hidden');
    }
}
