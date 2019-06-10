export default { renderRecommendation };

var firebase = require("firebase/app");
import { View } from '../constants/View';
import { Type } from '../constants/Type';
import { swrlUser } from '../firebase/login';
import { addStats } from './stats';
import { addLoveButton, addAddButton } from './buttons';
import { Collection } from '../constants/Collection';
import { markRecommendationAsRead } from '../actions/markRecommendationAsRead';
import { showToasterMessage } from './toaster';

/**
 * 
 * @param {View} view 
 * @param {Object} recommendation 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} container 
 */
export const renderRecommendation = async (view, recommendation, firestore, container) => {
    if (!recommendation.dismissed || recommendation.dismissed.indexOf(swrlUser.uid) === -1) {
        let recommendationTemplate = document.getElementById('recommendation');
        let recommendationFragment = recommendationTemplate.content.cloneNode(true);
        let $recommendation = recommendationFragment.querySelector.bind(recommendationFragment);
        let recommendationDiv = $recommendation('div');

        $recommendation('.swrlImage').src = recommendation.swrl.details.imageUrl;
        let creator = recommendation.swrl.details.author ? recommendation.swrl.details.author
            : recommendation.swrl.details.artist ? recommendation.swrl.details.artist : undefined;
        let title = creator ? recommendation.swrl.details.title + ' by ' + creator : recommendation.swrl.details.title;
        $recommendation('.swrlTitle').innerText = title;
        $recommendation('.swrlType').innerText = Type.properties[recommendation.swrl.type].name;

        addStats($recommendation, recommendationDiv, recommendation.swrl, view, firestore);
        addLoveButton(view, recommendation.swrl, $recommendation, recommendationDiv, firestore, recommendation);
        addAddButton(view, $recommendation, recommendationDiv, recommendation.swrl, firestore, null, recommendation);

        if (view === View.INBOX) {
            let fromSwrler = await getSwrler(recommendation.from, firestore);
            if (fromSwrler) {
                let recommenderTemplate = document.getElementById('recommender');
                let recommenderFragment = recommenderTemplate.content.cloneNode(true);
                let $recommender = recommenderFragment.querySelector.bind(recommenderFragment);
                $recommender('.swrlerSmallImage').src = fromSwrler.photoURL;
                $recommender('.recommenderName').innerText = fromSwrler.displayName;
                recommendationDiv.appendChild(recommenderFragment);
            }
        } else if (view === View.SENT) {
            let toSwrlers = await Promise.all(recommendation.to
                .map(async uid => {
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
            let recommendationMessageTemplate = document.getElementById('recommendationMessage');
            let recommendationMessageFragment = recommendationMessageTemplate.content.cloneNode(true);
            let $recommendationMessage = recommendationMessageFragment.querySelector.bind(recommendationMessageFragment);
            $recommendationMessage('.recommendationDetailsTitle').innerText = 'TO: ';
            $recommendationMessage('.recommenderMessage').innerText = toSwrlersText;
            recommendationDiv.appendChild(recommendationMessageFragment);
        }


        let recommendationMessageTemplate = document.getElementById('recommendationMessage');
        let recommendationMessageFragment = recommendationMessageTemplate.content.cloneNode(true);
        let $recommendationMessage = recommendationMessageFragment.querySelector.bind(recommendationMessageFragment);
        $recommendationMessage('.recommenderMessage').innerText = recommendation.message;
        recommendationDiv.appendChild(recommendationMessageFragment);

        if (view === View.INBOX) {

            let recommendationActionsTemplate = document.getElementById('recommendationActions');
            let recommendationActionsFragment = recommendationActionsTemplate.content.cloneNode(true);
            let $recommendationActions = recommendationActionsFragment.querySelector.bind(recommendationActionsFragment);
            $recommendationActions('.dismiss').addEventListener('click', (e) => {
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
            $recommendationActions('.markRead').addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                markRecommendationAsRead(recommendationDiv, recommendation, firestore);
                showToasterMessage('Marked ' + recommendation.swrl.details.title + ' as Read');

            });
            $recommendationActions('.markUnRead').addEventListener('click', (e) => {
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


        container.appendChild(recommendationFragment);
    }
}

/**
 * 
 * @param {View} view 
 * @param {Object} recommendation 
 * @param {HTMLElement} recommendationDiv 
 */
const showRead = (view, recommendation, recommendationDiv) => {
    if (view === View.SENT) {
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
 * @param {Object} recommendation 
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