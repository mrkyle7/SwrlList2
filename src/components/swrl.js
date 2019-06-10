export default { renderSwrl };

import { Type } from '../constants/Type';
import { View } from '../constants/View';
import { swrlUser } from '../firebase/login';
import { showRecommend } from '../views/recommend';
import showRequireLoginScreen from '../components/requireLoginScreen';
import markASwrlAsDone from '../actions/markASwrlAsDone';
import deleteSwrl from '../actions/deleteSwrl';
import { addStats } from './stats';
import { addLoveButton, addAddButton} from './buttons';
import { showToasterMessage } from './toaster';

export function renderSwrl(category, view, swrl, firestore, swrlsContainer) {
    if (!(view === View.DISCOVER && (isOnList(swrl) || isDeleted(swrl)))) {
        var swrlTemplate = document.querySelector('#swrl');
        var swrlFragment = swrlTemplate.content.cloneNode(true);
        var swrlDiv = swrlFragment.querySelector('div');
        var $swrl = swrlFragment.querySelector.bind(swrlFragment);
        $swrl('.swrlImage').src = swrl.details.imageUrl;
        var creator = swrl.details.author ? swrl.details.author
            : swrl.details.artist ? swrl.details.artist : undefined;
        var title = creator ? swrl.details.title + ' by ' + creator : swrl.details.title;
        $swrl('.swrlTitle').innerText = title;
        $swrl('.swrlType').innerText = Type.properties[swrl.type].name;

        addStats($swrl, swrlDiv, swrl, view, firestore);
        addAddButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);

        addRecommendButton($swrl, swrl, category, view, firestore);

        addLoveButton(view, swrl, $swrl, swrlDiv, firestore);
        addDoneButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);
        addDeleteButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);

        swrlsContainer.appendChild(swrlFragment);
    }
}

function addRecommendButton($swrl, swrl, category, view, firestore) {
    if (view !== View.RECOMMEND) {
        $swrl('.swrlRecommend').classList.remove('hidden');
        $swrl('.swrlRecommend').addEventListener('click', function () {
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to recommend a Swrl');
            } else {
                showRecommend(swrl, category, view, firestore);
            }
        });
    }
}

function addDeleteButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer) {
    if (view === View.YOUR_LIST || view === View.DISCOVER) {
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

function addDoneButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer) {
    if (view === View.YOUR_LIST) {
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

function isOnList(swrl) {
    return (swrl.later && swrl.later.indexOf(swrlUser.uid) !== -1) || (swrl.done && swrl.done.indexOf(swrlUser.uid) !== -1);
}

function isDeleted(swrl) {
    return swrl.deleted && swrl.deleted.indexOf(swrlUser.uid) !== -1;
}