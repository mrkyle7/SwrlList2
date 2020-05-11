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
import { Recommendation } from '../model/recommendation';
import { StateController } from '../views/stateController';
import { State } from '../model/state';
import markASwrlAsDone from '../actions/markASwrlAsDone';
import removeSwrlFromList from '../actions/removeSwrlFromList';
import unmarkASwrlAsDone from '../actions/unmarkASwrlAsDone';

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
 * @param {HTMLElement} div
 * @param {Swrl} swrl
 * @param {firebase.firestore.Firestore} firestore
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
    return swrl.later && swrl.later.indexOf(swrlUser.uid) !== -1
}

/**
 * @param {Swrl} swrl
 */
function isLoved(swrl) {
    return swrl.loved && swrl.loved.indexOf(swrlUser.uid) !== -1;
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
                showRequireLoginScreen('to recommend a Swrl');
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
 * @param {firebase.firestore.Firestore} firestore 
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
            }
        });
        if (swrl.done && swrl.done.indexOf(swrlUser.uid) !== -1) {
            swrlDiv.querySelector('.swrlDone').classList.remove('hidden');
        } else {
            swrlDiv.querySelector('.swrlNotDone').classList.remove('hidden');
        }
    }
}