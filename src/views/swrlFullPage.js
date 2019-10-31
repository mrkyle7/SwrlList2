const firebase = require("firebase/app");
import { View } from './View';
import { StateController } from './stateController';
import { State } from '../model/state';
import { getSwrler } from '../firebase/swrler';

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
                image.src = 'img/NoPoster.jpg'
            }
        });

    /** @type {HTMLTemplateElement} */
    // @ts-ignore
    const swrlPageCardTemplate = document.getElementById('swrlPageCard');

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

    /** @type {HTMLElement} */
    // @ts-ignore
    const swrlersCard = swrlPageCardTemplate.content.cloneNode(true);
    let $swrlersCard = swrlersCard.querySelector.bind(swrlersCard);

    $swrlersCard('.cardTitle').innerText = 'Swrlers'

    const added = await
        Promise.all(swrl.later.map(
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


    $swrlersCard('.cardContent');




    swrlFullPageCards.appendChild(swrlersCard);

}


function destroySwrlFullPage() {
    swrlFullPageView.classList.add('hidden');
    while (swrlFullPageCards.firstChild) {
        swrlFullPageCards.removeChild(swrlFullPageCards.firstChild);
    }
}