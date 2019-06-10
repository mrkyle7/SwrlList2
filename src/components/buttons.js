export default { addLoveButton, addAddButton };

import { View } from '../constants/View';
import { swrlUser } from '../firebase/login';
import loveASwrl from '../actions/loveASwrl';
import unloveASwrl from '../actions/unloveASwrl';
import addSwrlToList from '../actions/addSwrlToList';
import showRequireLoginScreen from '../components/requireLoginScreen';
import { markRecommendationAsRead } from '../actions/markRecommendationAsRead';
import { showToasterMessage } from './toaster';

/**
 * 
 * @param {View} view 
 * @param {Object} swrl 
 * @param {*} selector 
 * @param {HTMLElement} div 
 * @param {firebase.firestore.Firestore} firestore 
 */
export function addLoveButton(view, swrl, selector, div, firestore, recommendation) {
    if (view === View.YOUR_LIST || view === View.DISCOVER
        || view === View.INBOX || view === View.SENT) {
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
                if (view === View.INBOX) {
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
                if (view === View.INBOX) {
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
 * 
 * @param {View} view 
 * @param {*} selector 
 * @param {HTMLElement} div 
 * @param {Object} swrl 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} container 
 */
export function addAddButton(view, selector, div, swrl, firestore, swrlsContainer, recommendation) {
    if (view === View.DISCOVER || view === View.SEARCH
        || view === View.INBOX || view === View.SENT) {
        selector('.swrlAdd').classList.remove('hidden');
        selector('.swrlAdd').addEventListener('click', (e) => {
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to add a Swrl to your list');
            }
            else {
                addSwrlToList(swrl, firestore)
                    .catch(function (error) {
                        console.error('Could not add to list');
                        console.error(error);
                        div.querySelector('.swrlAdd').classList.remove('hidden');
                        div.querySelector('.swrlSpinner').classList.add('hidden');
                    });
                if (view === View.DISCOVER || view === View.SEARCH) {
                    div.querySelector('.swrlAdded').classList.remove('hidden');
                    setTimeout(function () {
                        swrlsContainer.removeChild(div);
                    }, 1000);
                }
                if (view === View.INBOX) {
                    markRecommendationAsRead(div, recommendation, firestore);
                }
                showToasterMessage('Added ' + swrl.details.title + ' to your list');
            }
        });
    }
}

function isLoved(swrl) {
    return swrl.loved && swrl.loved.indexOf(swrlUser.uid) !== -1;
}