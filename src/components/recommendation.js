const firebase = require("firebase/app");
import { INBOX, SENT } from '../constants/View';
import { swrlUser } from '../firebase/login';
import { addStats } from './stats';
import { addLoveButton, addAddButton, addRecommendButton, addDoneButton } from './buttons';
import { Collection } from '../constants/Collection';
import { markRecommendationAsRead } from '../actions/markRecommendationAsRead';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { Recommendation } from '../model/recommendation';
import { StateController } from '../views/stateController';
import { getSwrler } from '../firebase/swrler';
import { State } from '../model/state';

/**
 * 
 * @param {StateController} stateController
 * @param {Constant} view 
 * @param {Recommendation} recommendation 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} container 
 * @return {Promise<HTMLElement>}
 */
export const renderRecommendation = async (stateController, view, recommendation, firestore, container) => {
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
        $recommendation('.swrlImage').addEventListener('error',
            /**
             * @param {Event} e
             */
            (e) => {
                /** @type {HTMLImageElement} */
                // @ts-ignore
                const image = e.target;
                if (image) {
                    image.src = 'img/NoPoster.jpg'
                }
            });
        let creator = recommendation.swrl.details.author ? recommendation.swrl.details.author
            : recommendation.swrl.details.artist ? recommendation.swrl.details.artist : undefined;
        let title = creator ? recommendation.swrl.details.title + ' by ' + creator : recommendation.swrl.details.title;
        $recommendation('.swrlTitle').innerText = title;
        $recommendation('.swrlType').innerText = recommendation.swrl.type.name;

         /** @type {HTMLTemplateElement} */
        // @ts-ignore
        const swrlButtonsTemplate = document.getElementById('swrlButtons');
        const buttons = swrlButtonsTemplate.content.cloneNode(true);

        $recommendation('.swrlButtons').appendChild(buttons);

        addStats(recommendationDiv, recommendation.swrl);
        addLoveButton(view, recommendation.swrl, recommendationDiv, firestore, recommendation);
        addAddButton(view, recommendationDiv, recommendation.swrl, firestore, null, recommendation);
        addRecommendButton(recommendationDiv, recommendation.swrl, stateController);
        addDoneButton(recommendationDiv, recommendation.swrl, firestore, null, view);

        $recommendation('.recommendationSwrl').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            stateController.changeState(new State(stateController.swrlView,
                recommendation.swrl.category,
                stateController.currentState.searchTerms,
                recommendation.swrl));
        })

        if (view === INBOX) {
            const fromSwrler = await getSwrler(recommendation.from, firestore);
            if (fromSwrler) {
                /** @type {HTMLTemplateElement} */
                // @ts-ignore
                let recommenderTemplate = document.getElementById('recommender');
                /** @type {HTMLElement} */
                // @ts-ignore
                let recommenderFragment = recommenderTemplate.content.cloneNode(true);
                let $recommender = recommenderFragment.querySelector.bind(recommenderFragment);
                $recommender('.swrlerSmallImage').src = fromSwrler.photoURL;
                $recommender('.swrlerSmallImage').addEventListener('error',
                    /**
                     * @param {Event} e
                     */
                    (e) => {
                        /** @type {HTMLImageElement} */
                        // @ts-ignore
                        const image = e.target;
                        if (image) {
                            image.src = 'img/emoji_people-24px.svg' 
                        }
                    });
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
            $recommendationCreatedMessage('.recommenderMessage').innerText = recommendation.created.toUTCString();
            $recommendationCreatedMessage('.recommenderMessage').classList.add('date');
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
        return recommendationFragment;
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