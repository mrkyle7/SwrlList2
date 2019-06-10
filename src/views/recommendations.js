export default { showRecommendations };

import { View } from '../constants/View';
import { recommendationsCache } from '../listeners/recommendations';
import { Collection } from '../constants/Collection';
import { renderRecommendation } from '../components/recommendation';
import { swrlUser } from '../firebase/login';

const recommendationList = document.getElementById('recommendationList');

/**
 * 
 * @param {View} view 
 * @param {firebase.firestore.Firestore} firestore 
 */
export const showRecommendations = (view, firestore) => {
    clearList();
    if (view === View.INBOX) {
        showInboxFromCache(view, firestore);
    } else {
        showSentFromFirestore(view, firestore);
    }
}

const clearList = () => {
    while (recommendationList.firstChild) {
        recommendationList.removeChild(recommendationList.firstChild);
    }
}

/**
 * 
 * @param {View} view
 * @param {firebase.firestore.Firestore} firestore 
 */
const showInboxFromCache = (view, firestore) => {
    //Object.values isn't supported in cordova browser
    let recommendations = [];
    Object.keys(recommendationsCache).forEach(i => recommendations.push(recommendationsCache[i]));
    
    renderRecommendations(recommendations, view, firestore);
}

/**
 * 
 * @param {View} view  
 * @param {firebase.firestore.Firestore} firestore 
 */
const showSentFromFirestore = (view, firestore) => {
    firestore.collection(Collection.RECOMMENDATIONS)
        .where('from', '==', swrlUser.uid)
        .get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                let recommendations = [];
                querySnapshot.forEach(doc => {
                    let recommendation = doc.data();
                    recommendation.id = doc.id;
                    console.log(recommendation);
                    recommendations.push(recommendation)
                });
                renderRecommendations(recommendations, view, firestore);
            }
        })
        .catch(err => {
            console.error('Error getting sent recommendations');
            console.error(err);
        });
}

/**
 * 
 * @param {Array} recommendations 
 * @param {View} view  
 * @param {firebase.firestore.Firestore} firestore 
 */
const renderRecommendations = (recommendations, view, firestore) => {
    recommendations
        .sort((a, b) => {
            //sort by created date, showing latest first
            if (!a.created) return 1; //prefer b
            if (!b.created) return -1; //prefer a
            if (+a.created.seconds > +b.created.seconds) return -1;
            if (+b.created.seconds > +a.created.seconds) return 1;
            return 0;
        })
        .forEach(async recommendation => {
            let swrl = await firestore.collection(Collection.SWRLS).doc(recommendation.swrlID).get();
            if (swrl.exists) {
                let swrlData = swrl.data();
                recommendation.swrl = swrlData;
                renderRecommendation(view, recommendation, firestore, recommendationList)
            }
        })
}