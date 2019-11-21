export default { renderSwrl };

import { DISCOVER, YOUR_LIST, RECOMMEND, SEARCH } from '../constants/View';
import { swrlUser } from '../firebase/login';
import showRequireLoginScreen from '../components/requireLoginScreen';
import deleteSwrl from '../actions/deleteSwrl';
import { addStats } from './stats';
import { addLoveButton, addAddButton, addRecommendButton, addDoneButton } from './buttons';
import { showToasterMessage } from './toaster';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';
import { StateController } from '../views/stateController';
import { Collection } from '../constants/Collection';
import { State } from '../model/state';

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
        var title = creator ? swrl.details.title + ' by ' + creator : swrl.details.title;
        $swrl('.swrlTitle').innerText = title;
        $swrl('.swrlType').innerText = swrl.type.name;

        $swrl('.swrlListCount').classList.add('hidden');
        $swrl('.swrlSpinnerListCount').classList.remove('hidden');
        $swrl('.swrlRecommendedCount').classList.add('hidden');
        $swrl('.swrlSpinnerRecommendedCount').classList.remove('hidden');
        $swrl('.swrlLoveCount').classList.add('hidden');
        $swrl('.swrlSpinnerLoveCount').classList.remove('hidden');

        if (view === SEARCH || view === RECOMMEND) {
            //for these let's try get the latest swrl details for the buttons
            const docRef = firestore.collection(Collection.SWRLS).doc(swrl.swrlID);
            docRef.get()
                .then(doc => {
                    let latestSwrl = swrl;
                    if (doc.exists) {
                        try {
                            latestSwrl = Swrl.fromFirestore(doc.data());
                        } catch (error) {
                            console.error(`Error getting details for ${doc.id}`);
                            console.error(error);
                        }
                    }
                    addStats(swrlDiv, latestSwrl);
                    addLoveButton(view, latestSwrl, swrlDiv, firestore, null);
                    swrlDiv.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        stateController.changeState(new State(stateController.swrlView,
                            stateController.currentState.selectedCategory,
                            stateController.currentState.searchTerms,
                            latestSwrl));
                    })
                })
        } else {
            addStats(swrlDiv, swrl);
            addLoveButton(view, swrl, swrlDiv, firestore, null);
            swrlDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                stateController.changeState(new State(stateController.swrlView,
                    stateController.currentState.selectedCategory,
                    stateController.currentState.searchTerms,
                    swrl));
            })
        }

        addDoneButton(swrlDiv, swrl, firestore, swrlsContainer, view);
        addAddButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer, null);

        //Already on the recommend screen, so would be weird to recommend again!
        if (view !== RECOMMEND) {
            addRecommendButton($swrl, swrl, stateController);
        }

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
                showToasterMessage('Deleted ' + swrl.details.title + ' from your list');
            }
        });
    }
}

/**
 * @param {Swrl} swrl
 */
function isOnList(swrl) {
    return (swrl.later && swrl.later.indexOf(swrlUser.uid) !== -1)
        || (swrl.done && swrl.done.indexOf(swrlUser.uid) !== -1);
}

/**
 * @param {Swrl} swrl
 */
function isDeleted(swrl) {
    return swrl.deleted && swrl.deleted.indexOf(swrlUser.uid) !== -1;
}