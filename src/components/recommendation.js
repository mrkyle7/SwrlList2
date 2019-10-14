const firebase = require("firebase/app");
import { YOUR_LIST, DISCOVER, SEARCH, INBOX, SENT } from '../constants/View';
import { swrlUser } from '../firebase/login';
import { addStats } from './stats';
import { addLoveButton, addAddButton, addRecommendButton } from './buttons';
import { Collection } from '../constants/Collection';
import { markRecommendationAsRead } from '../actions/markRecommendationAsRead';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { Recommendation } from '../model/recommendation';
import { currentRenderID } from '../views/recommendations';

const loadingSpinner = document.getElementById('loadingSpinner');

/**
 * 
 * @param {Constant} view 
 * @param {Recommendation} recommendation 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} container 
 * @param {number} renderID
 */
export const renderRecommendation = async (view, recommendation, firestore, container, renderID) => {
    if (!recommendation.dismissed || recommendation.dismissed.indexOf(swrlUser.uid) === -1) {
        /** @type {HTMLTemplateElement} */
        // @ts-ignore
        let recommendationTemplate = document.getElementById('recommendation');
        /** @type {HTMLElement} */
        // @ts-ignore
        let recommendationFragment = recommendationTemplate.content.cloneNode(true);
        let $recommendation = recommendationFragment.querySelector.bind(recommendationFragment);
        let recommendationDiv = $recommendation('div');

        $recommendation('.swrlImage').src = recommendation.swrl.details.imageUrl;
        let creator = recommendation.swrl.details.author ? recommendation.swrl.details.author
            : recommendation.swrl.details.artist ? recommendation.swrl.details.artist : undefined;
        let title = creator ? recommendation.swrl.details.title + ' by ' + creator : recommendation.swrl.details.title;
        $recommendation('.swrlTitle').innerText = title;
        $recommendation('.swrlType').innerText = recommendation.swrl.type.name;

        addStats($recommendation, recommendationDiv, recommendation.swrl, view, firestore);
        // TODO: add this when deal with screen history better
        // addRecommendButton($recommendation, recommendation.swrl, recommendation.swrl.category, view, firestore);
        addLoveButton(view, recommendation.swrl, $recommendation, recommendationDiv, firestore, recommendation);
        addAddButton(view, $recommendation, recommendationDiv, recommendation.swrl, firestore, null, recommendation);

        if (view === INBOX) {
            let fromSwrler = await getSwrler(recommendation.from, firestore);
            if (fromSwrler) {
                /** @type {HTMLTemplateElement} */
                // @ts-ignore
                let recommenderTemplate = document.getElementById('recommender');
                /** @type {HTMLElement} */
                // @ts-ignore
                let recommenderFragment = recommenderTemplate.content.cloneNode(true);
                let $recommender = recommenderFragment.querySelector.bind(recommenderFragment);
                $recommender('.swrlerSmallImage').src = fromSwrler.photoURL;
                $recommender('.recommenderName').innerText = fromSwrler.displayName;
                recommendationDiv.appendChild(recommenderFragment);
            }
        } else if (view === SENT) {
            let toSwrlers = await
                Promise.all(recommendation.to
                    .map(
                        /**
                          * @param {string} uid
                         */
                        async uid => {
                            let swrler = await getSwrler(uid, firestore);
                            if (swrler) {
                                return swrler.displayName;
                            } else {
                                return undefined;
                            }
                        }));
            let toSwrlersText = toSwrlers
                .filter(displayName => displayName !== undefined)
                .join(', ');
            /** @type {HTMLTemplateElement} */
            // @ts-ignore
            let recommendationMessageTemplate = document.getElementById('recommendationMessage');
            /** @type {HTMLElement} */
            // @ts-ignore
            let recommendationMessageFragment = recommendationMessageTemplate.content.cloneNode(true);
            let $recommendationMessage = recommendationMessageFragment.querySelector.bind(recommendationMessageFragment);
            $recommendationMessage('.recommendationDetailsTitle').innerText = 'TO: ';
            $recommendationMessage('.recommenderMessage').innerText = toSwrlersText;
            recommendationDiv.appendChild(recommendationMessageFragment);
        }


        const recommendationMessageTemplate = document.getElementById('recommendationMessage');

        /** @type {HTMLElement} */
        // @ts-ignore
        const recommendationMessageFragment = recommendationMessageTemplate.content.cloneNode(true);
        const $recommendationMessage = recommendationMessageFragment.querySelector.bind(recommendationMessageFragment);
        $recommendationMessage('.recommenderMessage').innerText = recommendation.message;
        recommendationDiv.appendChild(recommendationMessageFragment);

        if (recommendation.created !== undefined && recommendation.created !== null) {
            /** @type {HTMLElement} */
            // @ts-ignore
            const recommendationCreatedMessageFragment = recommendationMessageTemplate.content.cloneNode(true);
            const $recommendationCreatedMessage = recommendationCreatedMessageFragment.querySelector.bind(recommendationCreatedMessageFragment);
            $recommendationCreatedMessage('.recommendationDetailsTitle').innerText = "SENT: ";
            $recommendationCreatedMessage('.recommenderMessage').innerText = recommendation.created.toUTCString();
            recommendationDiv.appendChild(recommendationCreatedMessageFragment);
        }

        if (view === INBOX) {

            let recommendationActionsTemplate = document.getElementById('recommendationActions');
            /** @type {HTMLElement} */
            // @ts-ignore
            let recommendationActionsFragment = recommendationActionsTemplate.content.cloneNode(true);
            let $recommendationActions = recommendationActionsFragment.querySelector.bind(recommendationActionsFragment);

            $recommendationActions('.dismiss').addEventListener('click',
                /** @param {Event} e */
                (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    firestore.collection(Collection.RECOMMENDATIONS).doc(recommendation.id).set({
                        dismissed: firebase.firestore.FieldValue.arrayUnion(swrlUser.uid)
                    }, { merge: true });
                    if (recommendationDiv) {
                        container.removeChild(recommendationDiv);
                        showToasterMessage('Dismissed ' + recommendation.swrl.details.title);
                    }
                });
            $recommendationActions('.markRead').addEventListener('click',
                /** @param {Event} e */
                (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    markRecommendationAsRead(recommendationDiv, recommendation, firestore);
                    showToasterMessage('Marked ' + recommendation.swrl.details.title + ' as Read');

                });
            $recommendationActions('.markUnRead').addEventListener('click',
                /** @param {Event} e */
                (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    firestore.collection(Collection.RECOMMENDATIONS).doc(recommendation.id).set({
                        read: firebase.firestore.FieldValue.arrayRemove(swrlUser.uid)
                    }, { merge: true });
                    if (recommendationDiv) {
                        recommendationDiv.classList.add('unread');
                        recommendationDiv.querySelector('.markRead').classList.remove('hidden');
                        recommendationDiv.querySelector('.markUnRead').classList.add('hidden');
                    }
                });
            recommendationDiv.appendChild(recommendationActionsFragment);

        }
        showRead(view, recommendation, recommendationDiv);

        if (renderID === currentRenderID) {
            loadingSpinner.classList.add('hidden');
            container.appendChild(recommendationFragment);
        } else {
            console.log('Recommendation view changed when about to add element');
        }
    }
}

/**
 * 
 * @param {Constant} view 
 * @param {Recommendation} recommendation 
 * @param {HTMLElement} recommendationDiv 
 */
const showRead = (view, recommendation, recommendationDiv) => {
    if (view === SENT) {
        recommendationDiv.classList.remove('unread');
    } else if (recommendation.read && recommendation.read.indexOf(swrlUser.uid) !== -1) {
        recommendationDiv.classList.remove('unread');

        recommendationDiv.querySelector('.markRead').classList.add('hidden');
        recommendationDiv.querySelector('.markUnRead').classList.remove('hidden');
    } else {
        recommendationDiv.querySelector('.markRead').classList.remove('hidden');
        recommendationDiv.querySelector('.markUnRead').classList.add('hidden');
    }
}

/**
 * 
 * @param {String} uid 
 * @param {firebase.firestore.Firestore} firestore 
 */
const getSwrler = (uid, firestore) => {
    return new Promise((resolve, reject) => {
        firestore.collection(Collection.SWRLERS)
            .doc(uid)
            .get()
            .then(docRef => {
                if (docRef.exists) {
                    resolve(docRef.data());
                } else {
                    resolve(undefined);
                }
            })
            .catch(err => {
                console.error('Error getting swrler');
                console.error(err);
                resolve(undefined);
            })
    });
}