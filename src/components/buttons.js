export default { addLoveButton, addAddButton, addRecommendButton };

import { swrlUser } from '../firebase/login';
import loveASwrl from '../actions/loveASwrl';
import unloveASwrl from '../actions/unloveASwrl';
import addSwrlToList from '../actions/addSwrlToList';
import showRequireLoginScreen from '../components/requireLoginScreen';
import { markRecommendationAsRead } from '../actions/markRecommendationAsRead';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { DISCOVER, SEARCH, INBOX, SENT, RECOMMEND, YOUR_LIST } from '../constants/View';
import { Swrl } from '../model/swrl';
import { Recommendation } from '../model/recommendation';
import { StateController } from '../views/stateController';
import { State } from '../model/state';
import markASwrlAsDone from '../actions/markASwrlAsDone';

/**
 * @param {Constant} view
 * @param {Swrl} swrl
 * @param {HTMLElement} div
 * @param {firebase.firestore.Firestore} firestore
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
 * @param {*} selector
 * @param {HTMLElement} div
 * @param {Swrl} swrl
 * @param {firebase.firestore.Firestore} firestore
 * @param {HTMLElement} swrlsContainer
 * @param {Recommendation} [recommendation]
 */
export function addAddButton(view, selector, div, swrl, firestore, swrlsContainer, recommendation) {
    if (view === DISCOVER || view === SEARCH
        || view === INBOX || view === SENT || view === RECOMMEND) {
        selector('.swrlAdd').classList.remove('hidden');
        selector('.swrlAdd').addEventListener('click',
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
                                div.querySelector('.swrlAdd').classList.remove('hidden');
                                div.querySelector('.swrlSpinner').classList.add('hidden');
                            });
                    if (view === DISCOVER || view === SEARCH) {
                        div.querySelector('.swrlAdded').classList.remove('hidden');
                        setTimeout(function () {
                            swrlsContainer.removeChild(div);
                        }, 1000);
                    }
                    if (view === INBOX) {
                        markRecommendationAsRead(div, recommendation, firestore);
                    }
                    showToasterMessage('Added ' + swrl.details.title + ' to your list');
                }
            });
    }
}

/**
 * @param {Swrl} swrl
 */
function isLoved(swrl) {
    return swrl.loved && swrl.loved.indexOf(swrlUser.uid) !== -1;
}

/**
 * @param {Function} $swrl
 * @param {Swrl} swrl
 * @param {StateController} stateController
 */
export function addRecommendButton($swrl, swrl, stateController) {
    $swrl('.swrlRecommend').classList.remove('hidden');
    $swrl('.swrlRecommend').addEventListener('click',
        /**
         * @param {Event} e
         */
        (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to recommend a Swrl');
            } else {
                const recommend = new State(stateController.recommendView,
                    stateController.currentState.selectedCategory,
                    stateController.currentState.searchTerms,
                    swrl);
                stateController.changeState(recommend);
            }
        });
}

/**
 * 
 * @param {HTMLElement} swrlDiv 
 * @param {Swrl} swrl 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} swrlsContainer 
 * @param {Constant} view
 * 
 */
export function addDoneButton(swrlDiv, swrl, firestore, swrlsContainer, view) {
    if (swrlDiv) {
        swrlDiv.querySelector('.swrlDone').classList.remove('hidden');
        swrlDiv.querySelector('.swrlDone').addEventListener('click', () => {
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to mark a Swrl as done');
            }
            else {
                markASwrlAsDone(swrl, firestore)
                    .catch(function (error) {
                        console.error('Could not add to list');
                        console.error(error);
                    });
                if (view === DISCOVER || view === SEARCH || view === YOUR_LIST) {
                    swrlDiv.querySelector('.swrlMarkedAsDone').classList.remove('hidden');
                    setTimeout(function () {
                        if (swrlDiv && swrlsContainer) {
                            swrlsContainer.removeChild(swrlDiv);
                        }
                    }, 1000);
                }
                showToasterMessage('Marked ' + swrl.details.title + ' as done');
            }
        });
    }
}