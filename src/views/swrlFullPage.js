const firebase = require("firebase/app");
import { View } from './View';
import { StateController } from './stateController';
import { State } from '../model/state';
import { getSwrler } from '../firebase/swrler';
import { swrlUser } from '../firebase/login';
import Collection from '../constants/Collection';
import { recommendationsCache } from '../listeners/recommendations';
import { Recommendation } from '../model/recommendation';

const swrlFullPageView = document.getElementById('swrlFullPage');
const swrlFullPageCards = document.getElementById('swrlFullPageCards');

export class SwrlFullPage extends View {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.swrlScreen);
    }

    show() {
        showSwrlFullPage(this.stateController);
    }

    destroy() {
        destroySwrlFullPage();
    }
}

/** @type {HTMLImageElement} */
// @ts-ignore
const swrlImageLarge = document.getElementById('swrlImageLarge');
/**
 * @param {StateController} stateController
 */
async function showSwrlFullPage(stateController) {
    swrlFullPageView.classList.remove('hidden');
    const swrl = stateController.currentState.swrl;
    const firestore = stateController.firestore;

    swrlImageLarge.src = swrl.details.imageUrl;
    swrlImageLarge.addEventListener('error',
        /**
         * @param {Event} e
         */
        (e) => {
            /** @type {HTMLImageElement} */
            // @ts-ignore
            const image = e.target;
            if (image) {
                image.src = 'img/NoPoster.jpg';
            }
        });

    /** @type {HTMLTemplateElement} */
    // @ts-ignore
    const swrlPageCardTemplate = document.getElementById('swrlPageCard');
    /** @type {HTMLTemplateElement} */
    // @ts-ignore
    const swrlPageSubCardTemplate = document.getElementById('swrlPageSubCard');

    /** @type {HTMLElement} */
    // @ts-ignore
    const titleCard = swrlPageCardTemplate.content.cloneNode(true);
    let $titleCard = titleCard.querySelector.bind(titleCard);

    $titleCard('.cardTitle').innerText = 'Title'
    $titleCard('.cardContent').innerText = swrl.details.getFullTitle();

    swrlFullPageCards.appendChild(titleCard);

    if (swrl.details.artist !== undefined) {
        /** @type {HTMLElement} */
        // @ts-ignore
        const artistCard = swrlPageCardTemplate.content.cloneNode(true);
        let $artistCard = artistCard.querySelector.bind(artistCard);

        $artistCard('.cardTitle').innerText = 'Artist'
        $artistCard('.cardContent').innerText = swrl.details.artist;

        swrlFullPageCards.appendChild(artistCard);
    }

    if (swrl.details.author !== undefined) {
        /** @type {HTMLElement} */
        // @ts-ignore
        const authorCard = swrlPageCardTemplate.content.cloneNode(true);
        let $authorCard = authorCard.querySelector.bind(authorCard);

        $authorCard('.cardTitle').innerText = 'Author'
        $authorCard('.cardContent').innerText = swrl.details.author;

        swrlFullPageCards.appendChild(authorCard);
    }

    if (swrl.isRecommended.includes(swrlUser.uid)) {
        /** @type {HTMLElement} */
        // @ts-ignore
        const recommendationsCard = swrlPageCardTemplate.content.cloneNode(true);
        const $recommendationsCard = recommendationsCard.querySelector.bind(recommendationsCard);

        $recommendationsCard('.cardTitle').innerText = 'Recommendations';
        const recommendationsContent = $recommendationsCard('.cardContent');

        swrlFullPageCards.appendChild(recommendationsCard);

        /** @type Recommendation[] */
        const recommendations = [];
        Object.keys(recommendationsCache).forEach(i => {
            /** @type Recommendation */
            const recommendation = recommendationsCache[i];
            if (recommendation.swrlID === swrl.swrlID) {
                recommendations.push(recommendation);
            }
        });

        recommendations.forEach(recommendation => {
            getSwrler(recommendation.from, firestore)
                .then(fromSwrler => {
                    if (fromSwrler) {
                        const recommender = getSwrlerSmall(fromSwrler);
                        recommendationsContent.appendChild(recommender);
                        
                        const recommendationMessageTemplate = document.getElementById('recommendationMessage');

                        /** @type {HTMLElement} */
                        // @ts-ignore
                        const recommendationMessageFragment = recommendationMessageTemplate.content.cloneNode(true);
                        const $recommendationMessage = recommendationMessageFragment.querySelector.bind(recommendationMessageFragment);
                        $recommendationMessage('.recommenderMessage').innerText = recommendation.message;
                        recommendationsContent.appendChild(recommendationMessageFragment);
                    }
                })
                .catch(err => {
                    console.error(err);
                })
        })
    }

    if (swrl.later.length > 0 || swrl.done.length > 0 || swrl.loved.length > 0) {

        /** @type {HTMLElement} */
        // @ts-ignore
        const swrlersCard = swrlPageCardTemplate.content.cloneNode(true);
        const $swrlersCard = swrlersCard.querySelector.bind(swrlersCard);

        $swrlersCard('.cardTitle').innerText = 'Swrlers';

        if (swrl.later.length > 0) {
            /** @type {HTMLElement} */
            // @ts-ignore
            const laterSubSection = swrlPageSubCardTemplate.content.cloneNode(true);
            const $laterSubSection = laterSubSection.querySelector.bind(laterSubSection);
            const laterSubSectionDiv = $laterSubSection('div');

            $laterSubSection('.cardSubTitle').innerText = 'Later';
            $swrlersCard('.cardContent').appendChild(laterSubSection);

            swrl.later.forEach(
                uid => {
                    getSwrler(uid, firestore)
                        .then(swrler => {
                            if (laterSubSectionDiv) {
                                const swrlerElement = getSwrlerSmall(swrler);
                                laterSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                            }
                        })
                        .catch(err => {
                            console.error(err);
                        });
                });
        }

        if (swrl.done.length > 0) {
            /** @type {HTMLElement} */
            // @ts-ignore
            const doneSubSection = swrlPageSubCardTemplate.content.cloneNode(true);
            const $doneSubSection = doneSubSection.querySelector.bind(doneSubSection);
            const doneSubSectionDiv = $doneSubSection('div');

            $doneSubSection('.cardSubTitle').innerText = 'Done';
            $swrlersCard('.cardContent').appendChild(doneSubSection);

            swrl.done.forEach(
                uid => {
                    getSwrler(uid, firestore)
                        .then(swrler => {
                            if (doneSubSectionDiv) {
                                const swrlerElement = getSwrlerSmall(swrler);
                                doneSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                            }
                        })
                        .catch(err => {
                            console.error(err);
                        });
                });
        }

        if (swrl.loved.length > 0) {

            /** @type {HTMLElement} */
            // @ts-ignore
            const lovedSubSection = swrlPageSubCardTemplate.content.cloneNode(true);
            const $lovedSubSection = lovedSubSection.querySelector.bind(lovedSubSection);
            const lovedSubSectionDiv = $lovedSubSection('div');

            $lovedSubSection('.cardSubTitle').innerText = 'Loved';
            $swrlersCard('.cardContent').appendChild(lovedSubSection);

            swrl.loved.forEach(
                uid => {
                    getSwrler(uid, firestore)
                        .then(swrler => {
                            if (lovedSubSectionDiv) {
                                const swrlerElement = getSwrlerSmall(swrler);
                                lovedSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                            }
                        })
                        .catch(err => {
                            console.error(err);
                        });
                });
        }
        swrlFullPageCards.appendChild(swrlersCard);
    }
}


function destroySwrlFullPage() {
    swrlFullPageView.classList.add('hidden');
    while (swrlFullPageCards.firstChild) {
        swrlFullPageCards.removeChild(swrlFullPageCards.firstChild);
    }
}

/**
 * @param {firebase.User} swrler
 */
function getSwrlerSmall(swrler) {
    var swrlerSmallTemplate = document.getElementById('swrlerSmall');
    // @ts-ignore
    var swrlerSmall = swrlerSmallTemplate.content.cloneNode(true);
    var $swrlerSmall = swrlerSmall.querySelector.bind(swrlerSmall);
    $swrlerSmall('.swrlerSmallImage').src = swrler.photoURL;
    $swrlerSmall('.swrlerSmallImage').addEventListener('error',
        /**
         * @param {Event} e
         */
        (e) => {
            /** @type {HTMLImageElement} */
            // @ts-ignore
            const image = e.target;
            if (image) {
                image.src = 'img/NoPoster.jpg' //TODO: get blank user photo
            }
        });
    $swrlerSmall('.swrlerSmallText').innerText = swrler.displayName;
    return swrlerSmall;
}