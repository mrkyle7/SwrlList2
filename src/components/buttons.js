export default { addLoveButton, addAddButton, addRecommendButton };

import { swrlUser } from '../firebase/login';
import loveASwrl from '../actions/loveASwrl';
import unloveASwrl from '../actions/unloveASwrl';
import addSwrlToList from '../actions/addSwrlToList';
import showRequireLoginScreen from '../components/requireLoginScreen';
import { markRecommendationAsRead } from '../actions/markRecommendationAsRead';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { YOUR_LIST, DISCOVER, SEARCH, INBOX, SENT } from '../constants/View';
import { Swrl } from '../model/swrl';
import { Recommendation } from '../model/recommendation';
import { StateController } from '../views/stateController';
import { State } from '../model/state';

/**
 * @param {Constant} view
 * @param {Swrl} swrl
 * @param {*} selector
 * @param {HTMLElement} div
 * @param {firebase.firestore.Firestore} firestore
 * @param {Recommendation} [recommendation]
 */
export function addLoveButton(view, swrl, selector, div, firestore, recommendation) {
    if (view === YOUR_LIST || view === DISCOVER
        || view === INBOX || view === SENT) {
        selector('.swrlLoved').addEventListener('click', (e) => {
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
        selector('.swrlNotLoved').addEventListener('click', (e) => {
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
            selector('.swrlLoved').classList.remove('hidden');
        } else {
            selector('.swrlNotLoved').classList.remove('hidden');
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
        || view === INBOX || view === SENT) {
        selector('.swrlAdd').classList.remove('hidden');
        selector('.swrlAdd').addEventListener('click', (e) => {
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
    $swrl('.swrlRecommend').addEventListener('click', function () {
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