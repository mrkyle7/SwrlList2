export default { renderSwrl };

import { DISCOVER, YOUR_LIST, RECOMMEND } from '../constants/View';
import { swrlUser } from '../firebase/login';
import showRequireLoginScreen from '../components/requireLoginScreen';
import markASwrlAsDone from '../actions/markASwrlAsDone';
import deleteSwrl from '../actions/deleteSwrl';
import { addStats } from './stats';
import { addLoveButton, addAddButton, addRecommendButton } from './buttons';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';
import { StateController } from '../views/stateController';

/**
 * 
 * @param {StateController} stateController 
 * @param {Constant} view 
 * @param {Swrl} swrl 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} swrlsContainer 
 */
export function renderSwrl(stateController, view, swrl, firestore, swrlsContainer) {
    if (!(view === DISCOVER && (isOnList(swrl) || isDeleted(swrl)))) {
        /** @type {HTMLTemplateElement} */
        // @ts-ignore
        var swrlTemplate = document.getElementById('swrl');
        /** @type {HTMLElement} */
        // @ts-ignore
        var swrlFragment = swrlTemplate.content.cloneNode(true);
        var swrlDiv = swrlFragment.querySelector('div');
        var $swrl = swrlFragment.querySelector.bind(swrlFragment);
        $swrl('.swrlImage').src = swrl.details.imageUrl;
        var creator = swrl.details.author ? swrl.details.author
            : swrl.details.artist ? swrl.details.artist : undefined;
        var title = creator ? swrl.details.title + ' by ' + creator : swrl.details.title;
        $swrl('.swrlTitle').innerText = title;
        $swrl('.swrlType').innerText = swrl.type.name;

        addStats($swrl, swrlDiv, swrl, view, firestore);
        addAddButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer, null);
        //Already on the recommend screen, so would be weird to recommend again!
        if (view !== RECOMMEND) {
            addRecommendButton($swrl, swrl, stateController);
        }

        addLoveButton(view, swrl, $swrl, swrlDiv, firestore, null);
        addDoneButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);
        addDeleteButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);

        swrlsContainer.appendChild(swrlFragment);
    }
}

/**
 * 
 * @param {Constant} view 
 * @param {Function} $swrl 
 * @param {HTMLElement} swrlDiv 
 * @param {Swrl} swrl 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} swrlsContainer 
 */
function addDeleteButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer) {
    if (view === YOUR_LIST || view === DISCOVER) {
        $swrl('.swrlDelete').classList.remove('hidden');
        $swrl('.swrlDelete').addEventListener('click', () => {
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
                showToasterMessage('Deleted ' + swrl.details.title + ' from your list');
            }
        });
    }
}

/**
 * 
 * @param {Constant} view 
 * @param {Function} $swrl 
 * @param {HTMLElement} swrlDiv 
 * @param {Swrl} swrl 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} swrlsContainer 
 */
function addDoneButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer) {
    if (view === YOUR_LIST) {
        $swrl('.swrlDone').classList.remove('hidden');
        $swrl('.swrlDone').addEventListener('click', () => {
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to mark a Swrl as done');
            }
            else {
                markASwrlAsDone(swrl, firestore)
                    .catch(function (error) {
                        console.error('Could not add to list');
                        console.error(error);
                    });
                swrlDiv.querySelector('.swrlMarkedAsDone').classList.remove('hidden');
                setTimeout(function () {
                    if (swrlDiv && swrlsContainer) {
                        swrlsContainer.removeChild(swrlDiv);
                    }
                }, 1000);
                showToasterMessage('Marked ' + swrl.details.title + ' as done');
            }
        });
    }
}

/**
 * @param {Swrl} swrl
 */
function isOnList(swrl) {
    return (swrl.later && swrl.later.indexOf(swrlUser.uid) !== -1) || (swrl.done && swrl.done.indexOf(swrlUser.uid) !== -1);
}

/**
 * @param {Swrl} swrl
 */
function isDeleted(swrl) {
    return swrl.deleted && swrl.deleted.indexOf(swrlUser.uid) !== -1;
}