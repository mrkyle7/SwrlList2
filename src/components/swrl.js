import { myGenres } from '../model/myGenres';
import { doc } from 'firebase/firestore';
import { getDocFast } from '../firebase/cacheFirst';
export default { renderSwrl };

import { DISCOVER, YOUR_LIST, RECOMMEND, SEARCH, SWRLER_LATER, SWRLER_LOVED, SWRLER_DONE } from '../constants/View';
import { getListEntry, whenListEntriesReady } from '../listeners/listEntries';
import { getLatestNote } from '../listeners/privateComments';
import { swrlUser } from '../firebase/login';
import showRequireLoginScreen from '../components/requireLoginScreen';
import deleteSwrl from '../actions/deleteSwrl';
import { addStats } from './stats';
import { addLoveButton, addAddButton, addRecommendButton, addDoneButton, addProgressBadge, addProgressButton } from './buttons';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';
import { swrlKind } from '../constants/Type';
import { inboxRecommendationsFor } from '../listeners/recommendations';
import { getSwrlerCached } from '../firebase/swrler';
import { recommendationReason } from '../model/recommendation';
import { StateController } from '../views/stateController';
import { Collection } from '../constants/Collection';
import { State } from '../model/state';
import { getLabelsFor } from '../listeners/labels';
import { cardMeta } from '../model/listView';
import { makeKeyboardClickable } from './keyboard';

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
    // textContent, never innerHTML: the details come from third parties
    $swrl('.swrlTitle').textContent = swrl.details.title;
    $swrl('.swrlMeta').textContent = cardMeta(swrlKind(swrl.type, swrl.details), swrl.details);
    $swrl('.swrlType').textContent = swrlKind(swrl.type, swrl.details);
    addDetailedParts(swrlDiv, swrl);
    showReason(swrlDiv, swrl, firestore);
    showNote(swrlDiv, swrl, firestore);

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
            addProgressBadge(swrlDiv, latestSwrl);
            // the quick Start / Watching button: on my own list only, where it is one tap from "what now"
            if (view === YOUR_LIST) addProgressButton(swrlDiv, latestSwrl, firestore);
            addAddButton(view, swrlDiv, latestSwrl, firestore, swrlsContainer, null);
            //Already on the recommend screen, so would be weird to recommend again!
            if (view !== RECOMMEND) {
                addRecommendButton(swrlDiv, swrl, stateController);
            }

            makeKeyboardClickable(swrlDiv, 'link');
        swrlDiv.setAttribute('aria-label', swrl.details.title);
        swrlDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const swrlFullPage = new State(stateController.swrlView);
                swrlFullPage.swrl = latest;
                stateController.changeState(swrlFullPage);
            })
        };
        // The buttons need only my own entries (local, from the cache), never
        // the network: they show as soon as those have loaded. The shared doc
        // (counts, latest details) comes from the cache at once when we have
        // it and from the server after, and only refreshes the counts.
        let latest = swrl;
        let shown = false;
        const useShared = (/** @type {import('firebase/firestore').DocumentSnapshot} */ docSnapshot) => {
            if (!docSnapshot || !docSnapshot.exists()) return;
            try {
                latest = Swrl.fromFirestore(docSnapshot.data());
                if (shown) addStats(swrlDiv, latest);
            } catch (error) {
                console.error(`Error getting details for ${docSnapshot.id}`);
                console.error(error);
            }
        };
        const shared = getDocFast(doc(firestore, Collection.SWRLS, swrl.swrlID), useShared)
            .then(useShared)
            .catch(error => {
                console.error(`Could not get the shared swrl for ${swrl.swrlID}`);
                console.error(error);
            });
        // my own entries must have loaded, or the buttons would all say "not on my list";
        // a cached shared doc usually arrives first, so the first counts are right too
        whenListEntriesReady()
            .then(() => Promise.race([shared, new Promise(resolve => setTimeout(resolve, 150))]))
            .then(() => {
                shown = true;
                showButtons(latest);
            });
    } else {
        addStats(swrlDiv, swrl);
        addLoveButton(view, swrl, swrlDiv, firestore, null);
        addDoneButton(swrlDiv, swrl, firestore, swrlsContainer, view);
        addProgressBadge(swrlDiv, swrl);
        addAddButton(view, swrlDiv, swrl, firestore, swrlsContainer, null);
        //Already on the recommend screen, so would be weird to recommend again!
        if (view !== RECOMMEND) {
            addRecommendButton(swrlDiv, swrl, stateController);
        }

        makeKeyboardClickable(swrlDiv, 'link');
        swrlDiv.setAttribute('aria-label', swrl.details.title);
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
        // five buttons, not four: the stats need more room beside them
        swrlDiv.classList.add('swrlHasDismiss');
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

/**
 * My latest note on the swrl, on its card, the way a friend's message is
 * shown. Notes are read one swrl at a time, so only swrls I have had on a
 * list (where notes are written) are looked up. Only I ever see them.
 *
 * @param {HTMLElement} swrlDiv
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function showNote(swrlDiv, swrl, firestore) {
    if (!swrlUser || swrlUser.isAnonymous) return;
    whenListEntriesReady()
        .then(() => getListEntry(swrl.swrlID) ? getLatestNote(swrl.swrlID, firestore) : undefined)
        .then(text => {
            if (!text) return;
            /** @type {HTMLElement} */
            const note = swrlDiv.querySelector('.swrlNote');
            // textContent, never innerHTML: it is whatever I typed
            note.querySelector('.swrlNoteText').textContent = text;
            note.title = 'Your note: ' + text;
            note.classList.remove('hidden');
        })
        .catch(error => console.error(error));
}

/** How many genres a detailed card shows. */
const GENRES_ON_CARD = 3;

/**
 * The parts only a detailed card shows: a few genres, my private labels and
 * the start of the story. They are always built and the stylesheet hides them
 * in the compact view, so the switch needs no redraw.
 *
 * @param {HTMLElement} swrlDiv
 * @param {Swrl} swrl
 */
export function addDetailedParts(swrlDiv, swrl) {
    const chips = swrlDiv.querySelector('.swrlChips');
    myGenres(swrl.details.genres, getListEntry(swrl.swrlID)).slice(0, GENRES_ON_CARD).forEach(genre => {
        const chip = document.createElement('span');
        chip.className = 'swrlChip';
        chip.textContent = genre;
        chips.appendChild(chip);
    });
    getLabelsFor(swrl.swrlID).forEach(label => {
        const chip = document.createElement('span');
        chip.className = 'swrlChip swrlChipLabel';
        chip.textContent = label;
        chips.appendChild(chip);
    });
    chips.classList.toggle('hidden', chips.childElementCount === 0);
    const overview = swrlDiv.querySelector('.swrlOverview');
    const story = swrl.details.overview ? swrl.details.overview.trim() : '';
    overview.textContent = story;
    overview.classList.toggle('hidden', !story);
}
