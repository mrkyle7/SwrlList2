
import { INBOX } from '../constants/View';
import { recommendationsCache } from '../listeners/recommendations';
import { Collection } from '../constants/Collection';
import { renderRecommendation } from '../components/recommendation';
import { swrlUser } from '../firebase/login';
import { Constant } from '../constants/Constant';
import { Recommendation } from '../model/recommendation';

const recommendationList = document.getElementById('recommendationList');
const loadingSpinner = document.getElementById('loadingSpinner');
/** @type {number} */
export let currentRenderID;

/**
 * @param {Constant} view 
 * @param {firebase.firestore.Firestore} firestore 
 */
export const showRecommendations = (view, firestore) => {
    currentRenderID = Math.random();
    clearList();
    loadingSpinner.classList.remove('hidden');
    if (view === INBOX) {
        showInboxFromCache(view, firestore, currentRenderID);
    } else {
        showSentFromFirestore(view, firestore, currentRenderID);
    }
}

export default { showRecommendations };

const clearList = () => {
    while (recommendationList.firstChild) {
        recommendationList.removeChild(recommendationList.firstChild);
    }
}

/**
 * 
 * @param {Constant} view
 * @param {firebase.firestore.Firestore} firestore 
 * @param {number} renderID
 */
const showInboxFromCache = (view, firestore, renderID) => {
    //Object.values isn't supported in cordova browser
    let recommendations = [];
    Object.keys(recommendationsCache).forEach(i => recommendations.push(recommendationsCache[i]));

    renderRecommendations(recommendations, view, firestore, renderID);
}

/**
 * 
 * @param {Constant} view  
 * @param {firebase.firestore.Firestore} firestore 
 * @param {number} renderID
 */
const showSentFromFirestore = (view, firestore, renderID) => {
    firestore.collection(Collection.RECOMMENDATIONS)
        .where('from', '==', swrlUser.uid)
        .get()
        .then(async querySnapshot => {
            if (!querySnapshot.empty) {
                /**  @type {Recommendation[]} */
                const recommendations = [];
                /**  @type {Promise[]} */
                const recommendationGetters = [];
                querySnapshot.forEach(doc => {
                    recommendationGetters.push(new Promise(async (resolve, reject) => {
                        const recommendation = await Recommendation.fromFirestore(doc, firestore);
                        recommendations.push(recommendation);
                        resolve();
                    }))
                });
                await Promise.all(recommendationGetters);
                renderRecommendations(recommendations, view, firestore, renderID);
            }
        })
        .catch(err => {
            console.error('Error getting sent recommendations');
            console.error(err);
        });
}

/**
 * 
 * @param {Recommendation[]} recommendations 
 * @param {Constant} view  
 * @param {firebase.firestore.Firestore} firestore 
 * @param {number} renderID
 */
const renderRecommendations = async (recommendations, view, firestore, renderID) => {
    const sortedRecommendations = recommendations
        .sort((a, b) => {
            //sort by created date, showing latest first
            if (a.created === undefined) return 1;
            if (b.created === undefined) return -1;
            if (a.created > b.created) return -1;
            if (b.created > a.created) return 1;
            return 0;
        });
    for (const next of sortedRecommendations) {
        if (renderID === currentRenderID) {
            await renderRecommendation(view, next, firestore, recommendationList, renderID);
        } else {
            console.log('Recommendation view changed');
            break;
        }
    }
}