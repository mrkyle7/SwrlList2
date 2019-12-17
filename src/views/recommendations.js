import { INBOX, SENT } from '../constants/View';
import { recommendationsInboxCache, recommendationsSentCache } from '../listeners/recommendations';
import { Collection } from '../constants/Collection';
import { renderRecommendation } from '../components/recommendation';
import { swrlUser } from '../firebase/login';
import { Constant } from '../constants/Constant';
import { Recommendation } from '../model/recommendation';
import { View } from './View';
import { StateController } from './stateController';

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
        showSentFromCache(stateController, view, firestore, currentRenderID);
    }
}

const destroyRecommendations = () => {
    recommendationTabs.classList.add('hidden');
    recommendationList.classList.add('hidden');
    loadingSpinner.classList.add('hidden');
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
    const recommendations = [];
    Object.keys(recommendationsInboxCache).forEach(i => recommendations.push(recommendationsInboxCache[i]));

    renderRecommendations(stateController, recommendations, view, firestore, renderID);
}

/**
 * 
 * @param {StateController} stateController
 * @param {Constant} view  
 * @param {firebase.firestore.Firestore} firestore 
 * @param {number} renderID
 */
const showSentFromCache = (stateController, view, firestore, renderID) => {
     //Object.values isn't supported in cordova browser
     const recommendations = [];
     Object.keys(recommendationsSentCache).forEach(i => recommendations.push(recommendationsSentCache[i]));
     renderRecommendations(stateController, recommendations, view, firestore, renderID);
 
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
        .forEach(recommendation => {
            elements.push(renderRecommendation(stateController, view, recommendation, firestore, recommendationList))
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