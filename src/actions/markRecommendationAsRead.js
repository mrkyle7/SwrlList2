import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { Recommendation } from '../model/recommendation';

/**
 * 
 * @param {HTMLElement} recommendationDiv 
 * @param {Recommendation} recommendation 
 * @param {import('firebase/firestore').Firestore} firestore 
 */
export const markRecommendationAsRead = (recommendationDiv, recommendation, firestore) => {
    setDoc(doc(firestore, Collection.RECOMMENDATIONS, recommendation.id), {
        read: arrayUnion(swrlUser.uid)
    }, { merge: true });
    if (recommendationDiv) {
        recommendationDiv.classList.remove('unread');
        recommendationDiv.querySelector('.markRead').classList.add('hidden');
        recommendationDiv.querySelector('.markUnRead').classList.remove('hidden');
    }
}
