const firebase = require("firebase/app");
import { View } from './View';
import { StateController } from './stateController';
import { State } from '../model/state';
import { getSwrler } from '../firebase/swrler';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { recommendationsInboxCache, recommendationsSentCache } from '../listeners/recommendations';
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

    try {
        if (swrl.isRecommended.some(id => id === swrlUser.uid)
            || swrl.recommendations.some(id => recommendationsSentCache.hasOwnProperty(id))) {
            /** @type {HTMLElement} */
            // @ts-ignore
            const recommendationsCard = swrlPageCardTemplate.content.cloneNode(true);
            const $recommendationsCard = recommendationsCard.querySelector.bind(recommendationsCard);

            $recommendationsCard('.cardTitle').innerText = 'Recommendations';
            $recommendationsCard('.cardContent').querySelector('.loadingSpinnerSmall').classList.add('hidden');

            if (swrl.isRecommended.some(id => id === swrlUser.uid)) {

                /** @type {HTMLElement} */
                // @ts-ignore
                const subSection = swrlPageSubCardTemplate.content.cloneNode(true);
                const $subSection = subSection.querySelector.bind(subSection);
                const subSectionDiv = $subSection('div');

                $subSection('.cardSubTitle').innerText = 'Inbox';
                const spinner = $subSection('.cardContent').querySelector('.loadingSpinnerSmall');
                $recommendationsCard('.cardContent').appendChild(subSection);

                const subContent = $subSection('.cardContent');
                /** @type Recommendation[] */
                const recommendations = [];
                Object.keys(recommendationsInboxCache).forEach(i => {
                    /** @type Recommendation */
                    const recommendation = recommendationsInboxCache[i];
                    if (recommendation.swrlID === swrl.swrlID) {
                        recommendations.push(recommendation);
                    }
                });

                recommendations.forEach(
                    async (recommendation, idx, arr) => {
                        try {
                            const fromSwrler = await getSwrler(recommendation.from, firestore);
                            if (fromSwrler) {
                                const recommender = getSwrlerSmall(fromSwrler);
                                if (subSectionDiv) {
                                    subSectionDiv.querySelector('.cardContent').appendChild(recommender);
                                    const recommendationMessageTemplate = document.getElementById('recommendationMessage');

                                    /** @type {HTMLElement} */
                                    // @ts-ignore
                                    const recommendationMessageFragment = recommendationMessageTemplate.content.cloneNode(true);
                                    const $recommendationMessage = recommendationMessageFragment.querySelector.bind(recommendationMessageFragment);
                                    $recommendationMessage('.recommenderMessage').innerText = recommendation.message;
                                    subSectionDiv.querySelector('.cardContent').appendChild(recommendationMessageFragment);
                                }
                            }
                        } catch (err) {
                            console.error(err);
                        }
                        if (idx === arr.length - 1) {
                            if (spinner) {
                                spinner.classList.add('hidden');
                            }
                        }
                    })
            }
            if (swrl.recommendations.some(id => recommendationsSentCache.hasOwnProperty(id))) {

                /** @type {HTMLElement} */
                // @ts-ignore
                const subSection = swrlPageSubCardTemplate.content.cloneNode(true);
                const $subSection = subSection.querySelector.bind(subSection);
                const subSectionDiv = $subSection('div');

                $subSection('.cardSubTitle').innerText = 'Sent';
                const spinner = $subSection('.cardContent').querySelector('.loadingSpinnerSmall');
                $recommendationsCard('.cardContent').appendChild(subSection);

                /** @type Recommendation[] */
                const recommendations = [];
                Object.keys(recommendationsSentCache).forEach(i => {
                    /** @type Recommendation */
                    const recommendation = recommendationsSentCache[i];
                    if (recommendation.swrlID === swrl.swrlID) {
                        recommendations.push(recommendation);
                    }
                });

                recommendations.forEach(
                    async (recommendation, idx, arr) => {
                        try {
                            const toSwrlers = await
                                Promise.all(recommendation.to
                                    .map(
                                        /**
                                          * @param {string} uid
                                         */
                                        async uid => {
                                            const swrler = await getSwrler(uid, firestore);
                                            if (swrler) {
                                                return swrler.displayName;
                                            } else {
                                                return undefined;
                                            }
                                        }));
                            const toSwrlersText = 'To: ' + toSwrlers
                                .filter(displayName => displayName !== undefined)
                                .join(', ');
                            if (subSectionDiv) {
                                const recommendationMessageTemplate = document.getElementById('recommendationMessage');
                                /** @type {HTMLElement} */
                                // @ts-ignore
                                const recommendationToFragment = recommendationMessageTemplate.content.cloneNode(true);
                                const $recommendationTo = recommendationToFragment.querySelector.bind(recommendationToFragment);
                                $recommendationTo('.recommenderMessage').innerText = toSwrlersText;

                                subSectionDiv.querySelector('.cardContent').appendChild(recommendationToFragment);

                                /** @type {HTMLElement} */
                                // @ts-ignore
                                const recommendationMessageFragment = recommendationMessageTemplate.content.cloneNode(true);
                                const $recommendationMessage = recommendationMessageFragment.querySelector.bind(recommendationMessageFragment);
                                $recommendationMessage('.recommenderMessage').innerText = recommendation.message;
                                subSectionDiv.querySelector('.cardContent').appendChild(recommendationMessageFragment);
                            }

                        } catch (err) {
                            console.error(err);
                        }
                        if (idx === arr.length - 1) {
                            if (spinner) {
                                spinner.classList.add('hidden');
                            }
                        }
                    })
            }
            swrlFullPageCards.appendChild(recommendationsCard);
        }
    } catch (err) {
        console.error('could not render recommendations');
        console.error(err);
    }

    try {
        if (swrl.later.length > 0 || swrl.done.length > 0 || swrl.loved.length > 0) {
            console.log('Show Swrlers');
            /** @type {HTMLElement} */
            // @ts-ignore
            const swrlersCard = swrlPageCardTemplate.content.cloneNode(true);
            const $swrlersCard = swrlersCard.querySelector.bind(swrlersCard);

            $swrlersCard('.cardTitle').innerText = 'Swrlers';
            $swrlersCard('.cardContent').querySelector('.loadingSpinnerSmall').classList.add('hidden');
            if (swrl.later.length > 0) {
                /** @type {HTMLElement} */
                // @ts-ignore
                const laterSubSection = swrlPageSubCardTemplate.content.cloneNode(true);
                const $laterSubSection = laterSubSection.querySelector.bind(laterSubSection);
                const laterSubSectionDiv = $laterSubSection('div');

                $laterSubSection('.cardSubTitle').innerText = 'Later';
                const spinner = $laterSubSection('.cardContent').querySelector('.loadingSpinnerSmall');
                $swrlersCard('.cardContent').appendChild(laterSubSection);

                swrl.later.forEach(
                    async (uid, idx, arr) => {
                        try {
                            const swrler = await getSwrler(uid, firestore);
                            if (laterSubSectionDiv) {
                                const swrlerElement = getSwrlerSmall(swrler);
                                laterSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                            }
                        } catch (err) {
                            console.error('could not add swrler');
                            console.error(err);
                        }

                        if (idx === arr.length - 1) {
                            if (spinner) {
                                spinner.classList.add('hidden');
                            }
                        }
                    });
            }

            if (swrl.done.length > 0) {
                /** @type {HTMLElement} */
                // @ts-ignore
                const doneSubSection = swrlPageSubCardTemplate.content.cloneNode(true);
                const $doneSubSection = doneSubSection.querySelector.bind(doneSubSection);
                const doneSubSectionDiv = $doneSubSection('div');

                $doneSubSection('.cardSubTitle').innerText = 'Done';
                const spinner = $doneSubSection('.cardContent').querySelector('.loadingSpinnerSmall');
                $swrlersCard('.cardContent').appendChild(doneSubSection);


                swrl.done.forEach(
                    async (uid, idx, arr) => {
                        try {
                            const swrler = await getSwrler(uid, firestore);
                            if (doneSubSectionDiv) {
                                const swrlerElement = getSwrlerSmall(swrler);
                                doneSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                            }
                        } catch (err) {
                            console.error('could not add swrler');
                            console.error(err);
                        }

                        if (idx === arr.length - 1) {
                            if (spinner) {
                                spinner.classList.add('hidden');
                            }
                        }
                    });
            }

            if (swrl.loved.length > 0) {

                /** @type {HTMLElement} */
                // @ts-ignore
                const lovedSubSection = swrlPageSubCardTemplate.content.cloneNode(true);
                const $lovedSubSection = lovedSubSection.querySelector.bind(lovedSubSection);
                const lovedSubSectionDiv = $lovedSubSection('div');

                $lovedSubSection('.cardSubTitle').innerText = 'Loved';
                const spinner = $lovedSubSection('.cardContent').querySelector('.loadingSpinnerSmall');
                $swrlersCard('.cardContent').appendChild(lovedSubSection);


                swrl.loved.forEach(
                    async (uid, idx, arr) => {
                        try {
                            const swrler = await getSwrler(uid, firestore);
                            if (lovedSubSectionDiv) {
                                const swrlerElement = getSwrlerSmall(swrler);
                                lovedSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                            }
                        } catch (err) {
                            console.error('could not add swrler');
                            console.error(err);
                        }

                        if (idx === arr.length - 1) {
                            if (spinner) {
                                spinner.classList.add('hidden');
                            }
                        }
                    });
            }
            swrlFullPageCards.appendChild(swrlersCard);
        }
    } catch (err) {
        console.error('could not render swrlers');
        console.error(err);
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
                image.src = 'img/emoji_people-24px.svg'
            }
        });
    $swrlerSmall('.swrlerSmallText').innerText = swrler.displayName;
    return swrlerSmall;
}