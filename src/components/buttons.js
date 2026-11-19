export default { addLoveButton, addAddButton, addRecommendButton };

import { swrlUser } from '../firebase/login';
import loveASwrl from '../actions/loveASwrl';
import unloveASwrl from '../actions/unloveASwrl';
import addSwrlToList from '../actions/addSwrlToList';
import showRequireLoginScreen from '../components/requireLoginScreen';
import { markRecommendationAsRead } from '../actions/markRecommendationAsRead';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { DISCOVER, SEARCH, INBOX, YOUR_LIST } from '../constants/View';
import { Swrl } from '../model/swrl';
import { getListEntry } from '../listeners/listEntries';
import { Recommendation } from '../model/recommendation';
import { StateController } from '../views/stateController';
import { State } from '../model/state';
import markASwrlAsDone from '../actions/markASwrlAsDone';
import removeSwrlFromList from '../actions/removeSwrlFromList';
import unmarkASwrlAsDone from '../actions/unmarkASwrlAsDone';
import markASwrlAsInProgress from '../actions/markASwrlAsInProgress';
import unmarkASwrlAsInProgress from '../actions/unmarkASwrlAsInProgress';
import { progressWords } from '../model/progress';

/**
 * @param {Constant} view
 * @param {Swrl} swrl
 * @param {HTMLElement} div
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {Recommendation} [recommendation]
 */
export function addLoveButton(view, swrl, div, firestore, recommendation) {
    if (div) {
        div.querySelector('.swrlLoved').addEventListener('click',
            /**
                 * @param {Event} e
                 */
            (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!swrlUser || swrlUser.isAnonymous) {
                    showRequireLoginScreen('to unlove a Swrl');
                }
                else {
                    unloveASwrl(swrl, firestore)
                        .catch((error) => {
                            console.error(error);
                        });;
                    div.querySelector('.swrlLoved').classList.add('hidden');
                    div.querySelector('.swrlNotLoved').classList.remove('hidden');
                    if (view === INBOX) {
                        markRecommendationAsRead(div, recommendation, firestore);
                    }
                }
            });
        div.querySelector('.swrlNotLoved').addEventListener('click',
            /**
                 * @param {Event} e
                 */
            (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!swrlUser || swrlUser.isAnonymous) {
                    showRequireLoginScreen('to love a Swrl');
                }
                else {
                    loveASwrl(swrl, firestore)
                        .catch((error) => {
                            console.error(error);
                        });
                    div.querySelector('.swrlNotLoved').classList.add('hidden');
                    div.querySelector('.swrlLoved').classList.remove('hidden');
                    if (view === INBOX) {
                        markRecommendationAsRead(div, recommendation, firestore);
                    }
                }
            });
        if (isLoved(swrl)) {
            div.querySelector('.swrlLoved').classList.remove('hidden');
        } else {
            div.querySelector('.swrlNotLoved').classList.remove('hidden');
        }
    }
}

/**
 * @param {Constant} view
 * @param {HTMLElement} div
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {HTMLElement} swrlsContainer
 * @param {Recommendation} [recommendation]
 */
export function addAddButton(view, div, swrl, firestore, swrlsContainer, recommendation) {
    if (div) {
        div.querySelector('.swrlNotAdded').addEventListener('click',
            /**
             * @param {Event} e
             */
            (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!swrlUser || swrlUser.isAnonymous) {
                    showRequireLoginScreen('to add a Swrl to your list');
                }
                else {
                    addSwrlToList(swrl, firestore)
                        .catch(/**
                         * @param {any} error
                         */
                            function (error) {
                                console.error('Could not add to list');
                                console.error(error);
                            });

                    div.querySelector('.swrlNotAdded').classList.add('hidden');
                    div.querySelector('.swrlAdded').classList.remove('hidden');
                    div.querySelector('.swrlDone').classList.add('hidden');
                    div.querySelector('.swrlNotDone').classList.remove('hidden');
                    if (view === INBOX) {
                        markRecommendationAsRead(div, recommendation, firestore);
                    }
                    showToasterMessage('Added ' + swrl.details.title + ' to your list');
                }
            });
        div.querySelector('.swrlAdded').addEventListener('click',
            /**
             * @param {Event} e
             */
            (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!swrlUser || swrlUser.isAnonymous) {
                    showRequireLoginScreen('to remove a Swrl from your list');
                }
                else {
                    removeSwrlFromList(swrl, firestore)
                        .catch(/**
                         * @param {any} error
                         */
                            function (error) {
                                console.error('Could not remove from list');
                                console.error(error);
                            });

                    div.querySelector('.swrlNotAdded').classList.remove('hidden');
                    div.querySelector('.swrlAdded').classList.add('hidden');
                    showInProgress(div, swrl, false);

                    showToasterMessage('Removed ' + swrl.details.title + ' from your list');
                }
            });
        if (isOnList(swrl)) {
            div.querySelector('.swrlAdded').classList.remove('hidden');
        } else {
            div.querySelector('.swrlNotAdded').classList.remove('hidden');
        }
    }
}

/**
 * @param {Swrl} swrl
 */
const isOnList = (swrl) => {
    const entry = getListEntry(swrl.swrlID);
    return entry !== undefined && entry.later;
}

/**
 * @param {Swrl} swrl
 */
function isLoved(swrl) {
    const entry = getListEntry(swrl.swrlID);
    return entry !== undefined && entry.loved;
}

/**
 * @param {Swrl} swrl
 */
function isDone(swrl) {
    const entry = getListEntry(swrl.swrlID);
    return entry !== undefined && entry.done;
}

/**
 * @param {HTMLElement} div
 * @param {Swrl} swrl
 * @param {StateController} stateController
 */
export function addRecommendButton(div, swrl, stateController) {
    div.querySelector('.swrlRecommend').classList.remove('hidden');
    div.querySelector('.swrlRecommend').addEventListener('click',
        /**
         * @param {Event} e
         */
        (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to swrl this to a friend');
            } else {
                const recommendView = new State(stateController.recommendView);
                recommendView.swrl = swrl;
                stateController.changeState(recommendView);
            }
        });
}

/**
 * 
 * @param {HTMLElement} swrlDiv 
 * @param {Swrl} swrl 
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {HTMLElement} swrlsContainer 
 * @param {Constant} view
 * 
 */
export function addDoneButton(swrlDiv, swrl, firestore, swrlsContainer, view) {
    if (swrlDiv) {
        swrlDiv.querySelector('.swrlDone').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to mark a Swrl as done');
            }
            else {
                unmarkASwrlAsDone(swrl, firestore)
                    .catch(function (error) {
                        console.error('Could not add to list');
                        console.error(error);
                    });
                showToasterMessage('Unmarked ' + swrl.details.title + ' as done');
                swrlDiv.querySelector('.swrlDone').classList.add('hidden');
                swrlDiv.querySelector('.swrlNotDone').classList.remove('hidden');
            }
        });
        swrlDiv.querySelector('.swrlNotDone').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to mark a Swrl as done');
            }
            else {
                markASwrlAsDone(swrl, firestore)
                    .catch(function (error) {
                        console.error('Could not add to list');
                        console.error(error);
                    });
                showToasterMessage('Marked ' + swrl.details.title + ' as done');
                swrlDiv.querySelector('.swrlNotDone').classList.add('hidden');
                swrlDiv.querySelector('.swrlDone').classList.remove('hidden');
                swrlDiv.querySelector('.swrlAdded').classList.add('hidden');
                swrlDiv.querySelector('.swrlNotAdded').classList.remove('hidden');
                showInProgress(swrlDiv, swrl, false);
            }
        });
        if (isDone(swrl)) {
            swrlDiv.querySelector('.swrlDone').classList.remove('hidden');
        } else {
            swrlDiv.querySelector('.swrlNotDone').classList.remove('hidden');
        }
    }
}
/**
 * @param {Swrl} swrl
 */
function isInProgress(swrl) {
    const entry = getListEntry(swrl.swrlID);
    return entry !== undefined && entry.later && entry.inProgress;
}

/**
 * Shows whether I have started a swrl, wherever the card or page has a place
 * for it: the badge by the type ("Watching") and the page's toggle.
 *
 * @param {HTMLElement} div
 * @param {Swrl} swrl
 * @param {boolean} inProgress
 */
function showInProgress(div, swrl, inProgress) {
    const words = progressWords(swrl.category.id);
    const badge = div.querySelector('.swrlProgress');
    if (badge) {
        badge.textContent = words.now;
        badge.classList.toggle('hidden', !inProgress);
    }
    // the toggle only where addProgressButton put one (the swrl page, Your list cards)
    if (!(div instanceof HTMLElement) || div.dataset.progressButtons !== 'on') return;
    const on = /** @type {HTMLElement} */ (div.querySelector('.swrlInProgress'));
    const off = /** @type {HTMLElement} */ (div.querySelector('.swrlNotInProgress'));
    if (on && off) {
        on.querySelector('.swrlButtonLabel, .swrlCardLabel').textContent = words.now;
        off.querySelector('.swrlButtonLabel, .swrlCardLabel').textContent = words.start;
        on.setAttribute('aria-label', words.now + '. Tap to undo');
        on.title = words.now + '. Tap to undo';
        off.setAttribute('aria-label', words.start);
        off.title = words.start;
        on.classList.toggle('hidden', !inProgress);
        off.classList.toggle('hidden', inProgress);
    }
}

/**
 * The "Watching" badge on a card, for a swrl I have started.
 *
 * @param {HTMLElement} swrlDiv
 * @param {Swrl} swrl
 */
export function addProgressBadge(swrlDiv, swrl) {
    if (swrlDiv) showInProgress(swrlDiv, swrl, isInProgress(swrl));
}

/**
 * The "Start watching" / "Watching" toggle, on the swrl page and on Your list cards. Starting puts the
 * swrl on my list and clears done; stopping leaves it on my list.
 *
 * @param {HTMLElement} pageDiv
 * @param {Swrl} swrl
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function addProgressButton(pageDiv, swrl, firestore) {
    if (!pageDiv) return;
    pageDiv.dataset.progressButtons = 'on';
    const words = progressWords(swrl.category.id);
    const button = (/** @type {string} */ selector) => /** @type {HTMLElement} */ (pageDiv.querySelector(selector));
    button('.swrlNotInProgress').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!swrlUser || swrlUser.isAnonymous) {
            showRequireLoginScreen('to keep track of what you are ' + words.caption);
            return;
        }
        markASwrlAsInProgress(swrl, firestore).catch(error => {
            console.error('Could not mark as in progress');
            console.error(error);
        });
        showInProgress(pageDiv, swrl, true);
        // it is on my list now, and not done
        button('.swrlAdded').classList.remove('hidden');
        button('.swrlNotAdded').classList.add('hidden');
        button('.swrlDone').classList.add('hidden');
        button('.swrlNotDone').classList.remove('hidden');
        showToasterMessage(words.now + ' ' + swrl.details.title);
    });
    button('.swrlInProgress').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!swrlUser || swrlUser.isAnonymous) return;
        unmarkASwrlAsInProgress(swrl, firestore).catch(error => {
            console.error('Could not unmark as in progress');
            console.error(error);
        });
        showInProgress(pageDiv, swrl, false);
        showToasterMessage('No longer ' + words.caption + ' ' + swrl.details.title);
    });
    showInProgress(pageDiv, swrl, isInProgress(swrl));
}
