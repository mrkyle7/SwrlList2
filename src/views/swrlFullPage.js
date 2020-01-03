const firebase = require("firebase/app");
import { View } from './View';
import { StateController } from './stateController';
import { State } from '../model/state';
import { getSwrler } from '../firebase/swrler';
import { swrlUser } from '../firebase/login';
import { Collection } from '../constants/Collection';
import { recommendationsInboxCache, recommendationsSentCache } from '../listeners/recommendations';
import { Recommendation } from '../model/recommendation';
import { Swrl } from '../model/swrl';

const swrlFullPageView = document.getElementById('swrlFullPage');
const swrlFullPageCards = document.getElementById('swrlFullPageCards');
const swrlFullPageSocialCards = document.getElementById('swrlFullPageSocialCards');
const loadingbar = document.querySelector('#swrlImageContainer .loadingbar')
/** @type {AbortController} */
let detailController = undefined;
let searchId = undefined;

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

    renderDetailCards(swrlPageCardTemplate, swrlPageSubCardTemplate, swrl);
    detailController = new AbortController();
    searchId = Math.random();
    loadingbar.classList.remove('hidden');
    console.log('getting new details');
    try {
        swrl.type.detailGetter.get(swrl.details.id, detailController.signal, searchId)
            .then(result => {
                if (result && result.details && result.id === searchId) {
                    const updatedSwrl = swrl;
                    updatedSwrl.details = result.details;
                    const firestoreData = updatedSwrl.toPartialFireStoreData();
                    firestoreData.updated = firebase.firestore.FieldValue.serverTimestamp();
                    firestore.collection(Collection.SWRLS).doc(updatedSwrl.swrlID).set(firestoreData,
                        { merge: true });
                    destroyDetailCards();
                    renderDetailCards(swrlPageCardTemplate, swrlPageSubCardTemplate, updatedSwrl);
                    console.log('got new details');
                    loadingbar.classList.add('hidden');
                }
            })
            .catch(err => {
                console.error('Could not get details');
                console.error(err);
                loadingbar.classList.add('hidden');
            });
    } catch (err) {
        console.error('Could not get details');
        console.error(err);
        loadingbar.classList.add('hidden');
    }
    renderSocialCards(swrl, swrlPageCardTemplate, swrlPageSubCardTemplate, firestore);
}

/**
 * 
 * @param {Swrl} swrl 
 * @param {HTMLTemplateElement} swrlPageCardTemplate 
 * @param {HTMLTemplateElement} swrlPageSubCardTemplate 
 * @param {firebase.firestore.Firestore} firestore 
 */
const renderSocialCards = (swrl, swrlPageCardTemplate, swrlPageSubCardTemplate, firestore) => {
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
                recommendations.forEach(async (recommendation, idx, arr) => {
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
                    }
                    catch (err) {
                        console.error(err);
                    }
                    if (idx === arr.length - 1) {
                        if (spinner) {
                            spinner.classList.add('hidden');
                        }
                    }
                });
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
                recommendations.forEach(async (recommendation, idx, arr) => {
                    try {
                        const toSwrlers = await Promise.all(recommendation.to
                            .map(
                                /**
                                  * @param {string} uid
                                 */
                                async (uid) => {
                                    const swrler = await getSwrler(uid, firestore);
                                    if (swrler) {
                                        return swrler.displayName;
                                    }
                                    else {
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
                    }
                    catch (err) {
                        console.error(err);
                    }
                    if (idx === arr.length - 1) {
                        if (spinner) {
                            spinner.classList.add('hidden');
                        }
                    }
                });
            }
            swrlFullPageSocialCards.appendChild(recommendationsCard);
        }
    }
    catch (err) {
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
                swrl.later.forEach(async (uid, idx, arr) => {
                    try {
                        const swrler = await getSwrler(uid, firestore);
                        if (laterSubSectionDiv) {
                            const swrlerElement = getSwrlerSmall(swrler);
                            laterSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                        }
                    }
                    catch (err) {
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
                swrl.done.forEach(async (uid, idx, arr) => {
                    try {
                        const swrler = await getSwrler(uid, firestore);
                        if (doneSubSectionDiv) {
                            const swrlerElement = getSwrlerSmall(swrler);
                            doneSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                        }
                    }
                    catch (err) {
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
                swrl.loved.forEach(async (uid, idx, arr) => {
                    try {
                        const swrler = await getSwrler(uid, firestore);
                        if (lovedSubSectionDiv) {
                            const swrlerElement = getSwrlerSmall(swrler);
                            lovedSubSectionDiv.querySelector('.cardContent').appendChild(swrlerElement);
                        }
                    }
                    catch (err) {
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
            swrlFullPageSocialCards.appendChild(swrlersCard);
        }
    }
    catch (err) {
        console.error('could not render swrlers');
        console.error(err);
    }
}

/**
 * @param {HTMLTemplateElement} swrlPageCardTemplate
 * @param {Swrl} swrl
 */
function renderDetailCards(swrlPageCardTemplate, swrlPageSubCardTemplate, swrl) {
    /** @type {HTMLElement} */
    // @ts-ignore
    const detailsCard = swrlPageCardTemplate.content.cloneNode(true);
    let $detailsCard = detailsCard.querySelector.bind(detailsCard);
    $detailsCard('.cardContent').querySelector('.loadingSpinnerSmall').classList.add('hidden');

    $detailsCard('.cardTitle').innerText = 'Details';

    addTextDetails('Title', swrl.details.getFullTitle());
    addTextDetails('Artist', swrl.details.artist);
    addTextDetails('Author', swrl.details.author);
    addTextDetails('Genres', swrl.details.genres !== undefined && swrl.details.genres !== null
        && swrl.details.genres.length > 0 ?
        swrl.details.genres.join(', ') :
        undefined);
    addTextDetails('Tagline', swrl.details.tagline);
    addTextDetails('Overview', swrl.details.overview);
    addTextDetails('Actors', swrl.details.actors !== undefined && swrl.details.actors !== null &&
        swrl.details.actors.length > 0 ?
        swrl.details.actors.join(', ') :
        undefined);
    addTextDetails('Director', swrl.details.director);
    addTextDetails('Runtime', swrl.details.runtime);
    addTextDetails('Average Episode Length', swrl.details.averageEpisodeLength);
    addTextDetails('Number of Seasons', swrl.details.numberOfSeasons !== undefined ?
        swrl.details.numberOfSeasons.toString() : undefined);
    addTextDetails('Last Air Date', swrl.details.lastAirDate);


    swrlFullPageCards.appendChild(detailsCard);


    if (swrl.details.links !== undefined && swrl.details.links !== null && swrl.details.links.length > 0) {
        /** @type {HTMLElement} */
        // @ts-ignore
        const linksCard = swrlPageCardTemplate.content.cloneNode(true);
        const $linksCard = linksCard.querySelector.bind(linksCard);
        $linksCard('.cardContent').querySelector('.loadingSpinnerSmall').classList.add('hidden');

        $linksCard('.cardTitle').innerText = 'Links';

        swrl.details.links.forEach(link => {
            const linkElement = document.createElement('a');
            linkElement.href = link.url;
            linkElement.target = '_blank';
            const image = document.createElement('img');
            image.classList.add('smallLink');
            image.src = link.logo;
            image.alt = link.name;
            image.title = link.name;
            linkElement.appendChild(image);
            $linksCard('.cardContent').appendChild(linkElement);
        })

        swrlFullPageCards.appendChild(linksCard);
    }

    if (swrl.details.networks !== undefined && swrl.details.networks !== null && swrl.details.networks.length > 0) {
        /** @type {HTMLElement} */
        // @ts-ignore
        const networksCard = swrlPageCardTemplate.content.cloneNode(true);
        const $networksCard = networksCard.querySelector.bind(networksCard);
        $networksCard('.cardContent').querySelector('.loadingSpinnerSmall').classList.add('hidden');

        $networksCard('.cardTitle').innerText = 'Networks';

        swrl.details.networks.forEach(link => {
            const span = document.createElement('span');
            const image = document.createElement('img');
            image.classList.add('smallLink');
            image.src = link.logo;
            image.alt = link.name;
            image.title = link.name;
            span.appendChild(image);
            $networksCard('.cardContent').appendChild(span);
        })

        swrlFullPageCards.appendChild(networksCard);
    }

    if (swrl.details.ratings !== undefined && swrl.details.ratings !== null && swrl.details.ratings.length > 0) {
        /** @type {HTMLElement} */
        // @ts-ignore
        const ratingsCard = swrlPageCardTemplate.content.cloneNode(true);
        const $ratingsCard = ratingsCard.querySelector.bind(ratingsCard);
        $ratingsCard('.cardContent').querySelector('.loadingSpinnerSmall').classList.add('hidden');

        $ratingsCard('.cardTitle').innerText = 'Ratings';

        /** @type {HTMLTemplateElement} */
        // @ts-ignore
        const ratingTemplate = document.getElementById('rating');
        swrl.details.ratings.forEach(rating => {

            /** @type {HTMLElement} */
            // @ts-ignore
            const ratingElement = ratingTemplate.content.cloneNode(true);

            if (rating.logo) {
                ratingElement.querySelector('img').src = rating.logo;
                ratingElement.querySelector('img').alt = rating.source;
                ratingElement.querySelector('img').title = rating.source;
                ratingElement.querySelector('span').innerText = rating.rating;
            } else {
                ratingElement.querySelector('img').classList.add('hidden');
                ratingElement.querySelector('span').innerText = `${rating.source}: ${rating.rating}`;
            }

            $ratingsCard('.cardContent').appendChild(ratingElement);
        })

        swrlFullPageCards.appendChild(ratingsCard);
    }


    /**
     * @param {string} title
     * @param {string} content
     */
    function addTextDetails(title, content) {
        if (content !== undefined && content !== null) {
            /** @type {HTMLElement} */
            // @ts-ignore
            const subSection = swrlPageSubCardTemplate.content.cloneNode(true);
            const $subSection = subSection.querySelector.bind(subSection);
            $subSection('.cardSubTitle').innerText = title;
            const subContent = $subSection('.cardContent');
            subContent.innerText = content;
            $detailsCard('.cardContent').appendChild(subSection);
        }
    }
}

function destroySwrlFullPage() {
    swrlFullPageView.classList.add('hidden');
    loadingbar.classList.add('hidden');
    if (detailController) {
        detailController.abort();
    }
    destroyDetailCards();
    while (swrlFullPageSocialCards.firstChild) {
        swrlFullPageSocialCards.removeChild(swrlFullPageSocialCards.firstChild);
    }
}

function destroyDetailCards() {
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