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
    var title = creator ? swrl.details.getFullTitle() + ' by ' + creator : swrl.details.getFullTitle();
    $swrl('.swrlTitle').innerText = title;
    $swrl('.swrlType').innerText = swrl.type.name;

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

    if (view === SEARCH || view === RECOMMEND) {
        $swrl('.swrlButtonSpinner').classList.remove('hidden');
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
                swrlDiv.querySelector('.swrlButtonSpinner').classList.add('hidden');
                addStats(swrlDiv, latestSwrl);
                addLoveButton(view, latestSwrl, swrlDiv, firestore, null);
                addDoneButton(swrlDiv, latestSwrl, firestore, swrlsContainer, view);
                addAddButton(view, swrlDiv, latestSwrl, firestore, swrlsContainer, null);
                //Already on the recommend screen, so would be weird to recommend again!
                if (view !== RECOMMEND) {
                    addRecommendButton(swrlDiv, swrl, stateController);
                }

                swrlDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const swrlFullPage = new State(stateController.swrlView);
                    swrlFullPage.swrl = latestSwrl;
                    stateController.changeState(swrlFullPage);
                })
            })
    } else {
        addStats(swrlDiv, swrl);
        addLoveButton(view, swrl, swrlDiv, firestore, null);
        addDoneButton(swrlDiv, swrl, firestore, swrlsContainer, view);
        addAddButton(view, swrlDiv, swrl, firestore, swrlsContainer, null);
        //Already on the recommend screen, so would be weird to recommend again!
        if (view !== RECOMMEND) {
            addRecommendButton(swrlDiv, swrl, stateController);
        }

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
 * @param {firebase.firestore.Firestore} firestore 
 * @param {HTMLElement} swrlsContainer 
 */
function addDeleteButton(view, $swrl, swrlDiv, swrl, firestore, swrlsContainer) {
    if (swrlDiv && view === DISCOVER) {
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
                showToasterMessage('Dismissed ' + swrl.details.title);
            }
        });
    }
}