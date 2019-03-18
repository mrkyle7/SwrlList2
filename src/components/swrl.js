export default { renderSwrl };

import { Type } from '../constants/Type';
import { View } from '../constants/View';
import { swrlUser } from '../firebase/login';
import showRequireLoginScreen from '../components/requireLoginScreen';
import addSwrlToList from '../actions/addSwrlToList';
import loveASwrl from '../actions/loveASwrl';
import unloveASwrl from '../actions/unloveASwrl';
import markASwrlAsDone from '../actions/markASwrlAsDone';
import deleteSwrl from '../actions/deleteSwrl';

export function renderSwrl(view, swrl, firestore, swrlsContainer) {
    if (!(view === View.DISCOVER && (isOnList(swrl) || isDeleted(swrl)))) {
        var swrlTemplate = document.querySelector('#swrl');
        var swrlFragment = swrlTemplate.content.cloneNode(true);
        var swrlDiv = swrlFragment.querySelector('div');
        var $swrl = swrlFragment.querySelector.bind(swrlFragment);
        $swrl('.swrlImage').src = swrl.details.imageUrl;
        $swrl('.swrlTitle').innerText = swrl.details.title;
        $swrl('.swrlType').innerText = Type.properties[swrl.type].name;

        addStats($swrl, swrlDiv, swrl, view, firestore);
        addAddButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);
        addLoveButton(view, swrl, $swrl, swrlDiv, firestore);
        addDoneButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);
        addDeleteButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer);

        swrlsContainer.appendChild(swrlFragment);
    }
}

/**
* @param {firebase.firestore.Firestore} firestore 
*/
function addStats($swrl, swrlDiv, swrl, view, firestore) {
    if (view === View.SEARCH) {
        $swrl('.swrlListCount').classList.add('hidden');
        $swrl('.swrlSpinnerListCount').classList.remove('hidden');
        $swrl('.swrlLoveCount').classList.add('hidden');
        $swrl('.swrlSpinnerLoveCount').classList.remove('hidden');
        var docRef = firestore.collection('swrls').doc(swrl.swrlID);
        docRef.get()
            .then((doc) => {
                if (doc.exists) {
                    var data = doc.data();
                    var laterCount = data.later ? data.later.length : 0;
                    var doneCount = data.done ? data.done.length : 0;
                    var lovedCount = data.loved ? data.loved.length : 0;
                    if (swrlDiv) {
                        updateStats(laterCount + doneCount, lovedCount);
                    }
                } else if (swrlDiv) {
                    updateStats(0, 0);
                }
            })
            .catch((err) => {
                console.error('Error when getting swrl stats');
                console.error(err);
                if (swrlDiv) {
                    updateStats(0, 0);
                }
            })

    } else {
        var laterCount = swrl.later ? swrl.later.length : 0;
        var doneCount = swrl.done ? swrl.done.length : 0;
        var lovedCount = swrl.loved ? swrl.loved.length : 0;

        $swrl('.swrlListCount').innerText = laterCount + doneCount;
        $swrl('.swrlLoveCount').innerText = lovedCount;
    }

    function updateStats(listCount, LoveCount) {
        swrlDiv.querySelector('.swrlListCount').classList.remove('hidden');
        swrlDiv.querySelector('.swrlSpinnerListCount').classList.add('hidden');
        swrlDiv.querySelector('.swrlLoveCount').classList.remove('hidden');
        swrlDiv.querySelector('.swrlSpinnerLoveCount').classList.add('hidden');

        swrlDiv.querySelector('.swrlListCount').innerText = listCount;
        swrlDiv.querySelector('.swrlLoveCount').innerText = LoveCount;
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
                swrlDiv.querySelector('.swrlDelete').classList.add('hidden');
                swrlDiv.querySelector('.swrlSpinnerDelete').classList.remove('hidden');
                deleteSwrl(swrl, firestore)
                    .then(() => {
                        swrlDiv.querySelector('.swrlDeleted').classList.remove('hidden');
                        setTimeout(function () {
                            swrlsContainer.removeChild(swrlDiv);
                        }, 1000);
                    })
                    .catch(function (error) {
                        console.error('Could not delete');
                        console.error(error);
                        swrlDiv.querySelector('.swrlDelete').classList.remove('hidden');
                        swrlDiv.querySelector('.swrlSpinnerDelete').classList.add('hidden');
                    });
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
                swrlDiv.querySelector('.swrlDone').classList.add('hidden');
                swrlDiv.querySelector('.swrlSpinner').classList.remove('hidden');
                markASwrlAsDone(swrl, firestore)
                    .then(() => {
                        swrlDiv.querySelector('.swrlMarkedAsDone').classList.remove('hidden');
                        setTimeout(function () {
                            swrlsContainer.removeChild(swrlDiv);
                        }, 1000);
                    })
                    .catch(function (error) {
                        console.error('Could not add to list');
                        console.error(error);
                        swrlDiv.querySelector('.swrlDone').classList.remove('hidden');
                        swrlDiv.querySelector('.swrlSpinner').classList.add('hidden');
                    });
            }
        });
    }
}

function addLoveButton(view, swrl, $swrl, swrlDiv, firestore) {
    if (view === View.YOUR_LIST || view === View.DISCOVER) {
        $swrl('.swrlLoved').addEventListener('click', (e) => {
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to unlove a Swrl');
            }
            else {
                swrlDiv.querySelector('.swrlLoved').classList.add('hidden');
                swrlDiv.querySelector('.swrlSpinner').classList.remove('hidden');
                unloveASwrl(swrl, firestore).then(() => {
                    swrlDiv.querySelector('.swrlSpinner').classList.add('hidden');
                    swrlDiv.querySelector('.swrlNotLoved').classList.remove('hidden');
                });
            }
        });
        $swrl('.swrlNotLoved').addEventListener('click', (e) => {
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to love a Swrl');
            }
            else {
                swrlDiv.querySelector('.swrlNotLoved').classList.add('hidden');
                swrlDiv.querySelector('.swrlSpinner').classList.remove('hidden');
                loveASwrl(swrl, firestore).then(() => {
                    swrlDiv.querySelector('.swrlSpinner').classList.add('hidden');
                    swrlDiv.querySelector('.swrlLoved').classList.remove('hidden');
                });
            }
        });
        if (isLoved(swrl)) {
            $swrl('.swrlLoved').classList.remove('hidden');
        } else {
            $swrl('.swrlNotLoved').classList.remove('hidden');
        }
    }
}

function isOnList(swrl) {
    return swrl.later.indexOf(swrlUser.uid) !== -1 || (swrl.done && swrl.done.indexOf(swrlUser.uid) !== -1);
}

function isDeleted(swrl) {
    return swrl.deleted && swrl.deleted.indexOf(swrlUser.uid) !== -1;
}

function isLoved(swrl) {
    return swrl.loved && swrl.loved.indexOf(swrlUser.uid) !== -1;
}

function addAddButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer) {
    if (view === View.DISCOVER || view === View.SEARCH) {
        $swrl('.swrlAdd').classList.remove('hidden');
        $swrl('.swrlAdd').addEventListener('click', (e) => {
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to add a Swrl to your list');
            }
            else {
                swrlDiv.querySelector('.swrlAdd').classList.add('hidden');
                swrlDiv.querySelector('.swrlSpinner').classList.remove('hidden');
                addSwrlToList(swrl, firestore)
                    .then(function () {
                        swrlDiv.querySelector('.swrlAdded').classList.remove('hidden');
                        setTimeout(function () {
                            swrlsContainer.removeChild(swrlDiv);
                        }, 1000);
                    })
                    .catch(function (error) {
                        console.error('Could not add to list');
                        console.error(error);
                        swrlDiv.querySelector('.swrlAdd').classList.remove('hidden');
                        swrlDiv.querySelector('.swrlSpinner').classList.add('hidden');
                    });
            }
        });
    }
}
