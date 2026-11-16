import { doc, getDoc } from 'firebase/firestore';
export default { renderSwrl };

import { DISCOVER, YOUR_LIST, RECOMMEND, SEARCH, SWRLER_LATER, SWRLER_LOVED, SWRLER_DONE } from '../constants/View';
import { whenListEntriesReady } from '../listeners/listEntries';
import { swrlUser } from '../firebase/login';
import showRequireLoginScreen from '../components/requireLoginScreen';
import deleteSwrl from '../actions/deleteSwrl';
import { addStats } from './stats';
import { addLoveButton, addAddButton, addRecommendButton, addDoneButton } from './buttons';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';
import { typeLabel } from '../constants/Type';
import { inboxRecommendationsFor } from '../listeners/recommendations';
import { getSwrlerCached } from '../firebase/swrler';
import { recommendationReason } from '../model/recommendation';
import { StateController } from '../views/stateController';
import { Collection } from '../constants/Collection';
import { State } from '../model/state';

/**
 * 
 * @param {StateController} stateController 
 * @param {Constant} view 
 * @param {Swrl} swrl 
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {HTMLElement} swrlsContainer 
 */
export function renderSwrl(stateController, view, swrl, firestore, swrlsContainer) {
    /** @type {HTMLTemplateElement} */
    // @ts-ignore
    var swrlTemplate = document.getElementById('swrl');
    /** @type {HTMLElement} */
    // @ts-ignore
    var swrlFragment = swrlTemplate.content.cloneNode(true);
    var swrlDiv = swrlFragment.querySelector('div');
    var $swrl = swrlFragment.querySelector.bind(swrlFragment);
    $swrl('.swrlImage').src = swrl.details.imageUrl;
    $swrl('.swrlImage').addEventListener('error',
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
    var creator = swrl.details.author ? swrl.details.author
        : swrl.details.artist ? swrl.details.artist : undefined;
    var title = creator ? swrl.details.getFullTitle() + ' by ' + creator : swrl.details.getFullTitle();
    $swrl('.swrlTitle').innerText = title;
    $swrl('.swrlType').innerText = typeLabel(swrl.type);
    showReason(swrlDiv, swrl, firestore);

    $swrl('.swrlListCount').classList.add('hidden');
    $swrl('.swrlSpinnerListCount').classList.remove('hidden');
    $swrl('.swrlRecommendedCount').classList.add('hidden');
    $swrl('.swrlSpinnerRecommendedCount').classList.remove('hidden');
    $swrl('.swrlLoveCount').classList.add('hidden');
    $swrl('.swrlSpinnerLoveCount').classList.remove('hidden');

    /** @type {HTMLTemplateElement} */
    // @ts-ignore
    const swrlButtonsTemplate = document.getElementById('swrlButtons');
    const buttons = swrlButtonsTemplate.content.cloneNode(true);

    $swrl('.swrlButtons').appendChild(buttons);

    if (view === SEARCH || view === RECOMMEND || view === YOUR_LIST
        || view === SWRLER_LATER || view === SWRLER_LOVED || view === SWRLER_DONE) {
        $swrl('.swrlButtonSpinner').classList.remove('hidden');
        //for these let's get the shared swrl (counts, latest details) for the buttons and stats. The card
        //shows straight away; where there is no shared doc yet (or it can't be read) we keep the swrl we were given.
        const showButtons = (/** @type {Swrl} */ latestSwrl) => {
            swrlDiv.querySelector('.swrlButtonSpinner').classList.add('hidden');
            addStats(swrlDiv, latestSwrl);
            addLoveButton(view, latestSwrl, swrlDiv, firestore, null);
            addDoneButton(swrlDiv, latestSwrl, firestore, swrlsContainer, view);
            addAddButton(view, swrlDiv, latestSwrl, firestore, swrlsContainer, null);
            //Already on the recommend screen, so would be weird to recommend again!
            if (view !== RECOMMEND) {
                addRecommendButton(swrlDiv, swrl, stateController);
            }

            swrlDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const swrlFullPage = new State(stateController.swrlView);
                swrlFullPage.swrl = latestSwrl;
                stateController.changeState(swrlFullPage);
            })
        };
        // my own entries must have loaded, or the buttons would all say "not on my list"
        Promise.all([
            getDoc(doc(firestore, Collection.SWRLS, swrl.swrlID)).catch(error => {
                console.error(`Could not get the shared swrl for ${swrl.swrlID}`);
                console.error(error);
                return undefined;
            }),
            whenListEntriesReady()])
            .then(([docSnapshot]) => {
                let latestSwrl = swrl;
                if (docSnapshot && docSnapshot.exists()) {
                    try {
                        latestSwrl = Swrl.fromFirestore(docSnapshot.data());
                    } catch (error) {
                        console.error(`Error getting details for ${docSnapshot.id}`);
                        console.error(error);
                    }
                }
                showButtons(latestSwrl);
            });
    } else {
        addStats(swrlDiv, swrl);
        addLoveButton(view, swrl, swrlDiv, firestore, null);
        addDoneButton(swrlDiv, swrl, firestore, swrlsContainer, view);
        addAddButton(view, swrlDiv, swrl, firestore, swrlsContainer, null);
        //Already on the recommend screen, so would be weird to recommend again!
        if (view !== RECOMMEND) {
            addRecommendButton(swrlDiv, swrl, stateController);
        }

        swrlDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const swrlFullPage = new State(stateController.swrlView);
            swrlFullPage.swrl = swrl;
            stateController.changeState(swrlFullPage);
        })
    }


    addDeleteButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);

    swrlsContainer.appendChild(swrlFragment);

}

/**
 * 
 * @param {Constant} view 
 * @param {Function} $swrl 
 * @param {HTMLElement} swrlDiv 
 * @param {Swrl} swrl 
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {HTMLElement} swrlsContainer 
 */
function addDeleteButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer) {
    if (swrlDiv && view === DISCOVER) {
        $swrl('.swrlDelete').classList.remove('hidden');
        $swrl('.swrlDelete').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to delete a Swrl');
            }
            else {
                deleteSwrl(swrl, firestore)
                    .catch(function (error) {
                        console.error('Could not delete');
                        console.error(error);
                    });
                swrlDiv.querySelector('.swrlDeleted').classList.remove('hidden');
                setTimeout(function () {
                    if (swrlDiv && swrlsContainer) {
                        swrlsContainer.removeChild(swrlDiv);
                    }
                }, 1000);
                showToasterMessage('Dismissed ' + swrl.details.title);
            }
        });
    }
}

/**
 * Shows who recommended this swrl to me, and their message, on its card.
 *
 * @param {HTMLElement} swrlDiv
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 */
function showReason(swrlDiv, swrl, firestore) {
    const recommendations = inboxRecommendationsFor(swrl.swrlID);
    if (recommendations.length === 0) return;
    const senders = [...new Set(recommendations.map(recommendation => recommendation.from))];
    Promise.all(senders.map(uid => getSwrlerCached(uid, firestore)))
        .then(swrlers => {
            const text = recommendationReason(swrlers.map(swrler => swrler && swrler.displayName), recommendations[0].message);
            if (!text) return;
            /** @type {HTMLElement} */
            const reason = swrlDiv.querySelector('.swrlReason');
            // textContent, never innerHTML: the message is whatever a user typed.
            reason.querySelector('.swrlReasonText').textContent = text;
            reason.title = text;
            reason.classList.remove('hidden');
        })
        .catch(error => console.error(error));
}
