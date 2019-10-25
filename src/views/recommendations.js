
import { INBOX, SENT } from '../constants/View';
import { recommendationsCache } from '../listeners/recommendations';
import { Collection } from '../constants/Collection';
import { renderRecommendation } from '../components/recommendation';
import { swrlUser } from '../firebase/login';
import { Constant } from '../constants/Constant';
import { Recommendation } from '../model/recommendation';
import { View } from './View';
import { StateController } from './stateController';
import { RecommendationsScreen } from '../screens/recommendationsScreen';

export class InboxRecommendations extends View {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.recommendationsScreen);
    }

    show() {
        showRecommendations(this.stateController, INBOX, this.firestore);
    }

    destroy() {
        destroyRecommendations();
    }

}

export class SentRecommendations extends View {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.recommendationsScreen);
    }

    show() {
        showRecommendations(this.stateController, SENT, this.firestore);
    }

    destroy() {
        destroyRecommendations();
    }
}

const loadingSpinner = document.getElementById('loadingSpinner');
const inboxTab = document.getElementById('inboxTab');
const sentTab = document.getElementById('sentTab');

/** @type {HTMLDivElement} */
// @ts-ignore
const recommendationList = document.getElementById('recommendationList');
const recommendationTabs = document.getElementById('recommendationTabs');

/** @type {number} */
export let currentRenderID;

/**
 * @param {StateController} stateController
 * @param {Constant} view 
 * @param {firebase.firestore.Firestore} firestore 
 */
const showRecommendations = (stateController, view, firestore) => {
    recommendationTabs.classList.remove('hidden');
    recommendationList.classList.remove('hidden');
    currentRenderID = Math.random();
    clearList();
    loadingSpinner.classList.remove('hidden');
    if (view === INBOX) {
        showInboxFromCache(stateController, view, firestore, currentRenderID);
        inboxTab.classList.add('selected');
        sentTab.classList.remove('selected');
    } else {
        inboxTab.classList.remove('selected');
        sentTab.classList.add('selected');
        showSentFromFirestore(stateController, view, firestore, currentRenderID);
    }
}

const destroyRecommendations = () => {
    recommendationTabs.classList.add('hidden');
    recommendationList.classList.add('hidden');
}

const clearList = () => {
    while (recommendationList.firstChild) {
        recommendationList.removeChild(recommendationList.firstChild);
    }
}

/**
 * 
 * @param {StateController} stateController
 * @param {Constant} view
 * @param {firebase.firestore.Firestore} firestore 
 * @param {number} renderID
 */
const showInboxFromCache = (stateController, view, firestore, renderID) => {
    //Object.values isn't supported in cordova browser
    let recommendations = [];
    Object.keys(recommendationsCache).forEach(i => recommendations.push(recommendationsCache[i]));

    renderRecommendations(stateController, recommendations, view, firestore, renderID);
}

/**
 * 
 * @param {StateController} stateController
 * @param {Constant} view  
 * @param {firebase.firestore.Firestore} firestore 
 * @param {number} renderID
 */
const showSentFromFirestore = (stateController, view, firestore, renderID) => {
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
                renderRecommendations(stateController, recommendations, view, firestore, renderID);
            }
        })
        .catch(err => {
            console.error('Error getting sent recommendations');
            console.error(err);
        });
}

/**
 * 
 * @param {StateController} stateController
 * @param {Recommendation[]} recommendations 
 * @param {Constant} view  
 * @param {firebase.firestore.Firestore} firestore 
 * @param {number} renderID
 */
const renderRecommendations = async (stateController, recommendations, view, firestore, renderID) => {
    const elements = [];
    recommendations
        .sort((a, b) => {
            //sort by created date, showing latest first
            if (a.created === undefined) return 1;
            if (b.created === undefined) return -1;
            if (a.created > b.created) return -1;
            if (b.created > a.created) return 1;
            return 0;
        })
        .forEach(r => {
            elements.push(renderRecommendation(stateController, view, r, firestore, recommendationList, renderID))
        });
    Promise.all(elements).then((element) => {
        if (renderID === currentRenderID) {
            loadingSpinner.classList.add('hidden');
            element.forEach(recommendationHTML => {
                if (recommendationHTML !== undefined) {
                    recommendationList.appendChild(recommendationHTML);
                }
            })
        } else {
            console.log('Recommendation view changed when about to add elements');
        }
    });
}