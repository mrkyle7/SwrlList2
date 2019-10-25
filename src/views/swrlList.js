export default { showList, destroyList };

import { YOUR_LIST, DISCOVER } from '../constants/View';
import { Collection } from '../constants/Collection';
import { Category } from '../constants/Category';
import { swrlUser } from '../firebase/login';
import { renderSwrl } from '../components/swrl';
import showRequireLoginScreen from '../components/requireLoginScreen';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';
import { View } from './View';
import { StateController } from './stateController';

export class YourListView extends View {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.listScreen)
    }

    show() {
        showList(this.stateController.currentState.selectedCategory, YOUR_LIST, this.firestore, this.stateController);
    }

    destroy() {
        destroyList();
    }
}

export class DiscoverView extends View {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.listScreen)
    }

    show() {
        showList(this.stateController.currentState.selectedCategory, DISCOVER, this.firestore, this.stateController);
    }

    destroy() {
        destroyList();
    }
}

/** @type {HTMLDivElement} */
// @ts-ignore
const yourListTab = document.getElementById('yourListTab');

/** @type {HTMLDivElement} */
// @ts-ignore
const discoverTab = document.getElementById('discoverTab');

var swrlsContainer = document.getElementById('swrlList');
var currentID;

/**
 * @param {Category} category
 * @param {Constant} view
 * @param {firebase.firestore.Firestore} firestore
 * @param {StateController} stateController
 */
export function showList(category, view, firestore, stateController) {
    const tabs = document.getElementById('tabs');
    tabs.classList.remove('hidden');

    currentID = Math.random();
    var resultsID = currentID;
    clearList();
    if (view === YOUR_LIST) {
        yourListTab.classList.add('selected');
    } else if (view === DISCOVER) {
        discoverTab.classList.add('selected');
    }
    document.getElementById('swrlList').classList.remove('hidden');
    document.getElementById('messageContainer').classList.remove('hidden');
    document.getElementById('message').innerText = 'Loading Swrls...';
    document.querySelector('#messageContainer .loadingSpinner').classList.remove('hidden');
    var swrlsRef = firestore.collection(Collection.SWRLS);
    if (swrlsRef) {
        runQuery(swrlsRef, category, view)
            .then(function (querySnapshot) {
                if (currentID === resultsID) {
                    document.getElementById('messageContainer').classList.add('hidden');
                    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
                    if (!querySnapshot.empty) {
                        querySnapshot.forEach(
                            /**
                             * @param {firebase.firestore.QueryDocumentSnapshot} docSnapshot
                             */
                            function (docSnapshot) {
                                const swrl = Swrl.fromFirestore(docSnapshot.data());
                                renderSwrl(stateController, view, swrl, firestore, swrlsContainer);
                            })
                        if (view === DISCOVER && swrlsContainer.querySelectorAll('div').length == 0) {
                            console.log('No Swrls to discover');
                            showNoSwrlsDiscoverView(category);
                        }
                    } else {
                        console.log("No Swrls found");
                        showNoSwrlsView(category);
                    }
                } else {
                    console.log('View was changed');
                }
            })
            .catch(function (error) {
                console.error(error);
                console.error("Couldn't get swrls!");
                showNoSwrlsView(category);
            })
    } else {
        if (currentID === resultsID) {
            console.log("No Swrls found");
            showNoSwrlsView(category);
        } else {
            console.log('View was changed');
        }
    }
}

/**
 * 
 * @param {firebase.firestore.CollectionReference} db 
 * @param {Category} category 
 * @param {Constant} view 
 * @return {Promise}
 */
function runQuery(db, category, view) {
    switch (view) {
        case YOUR_LIST:
            if (!swrlUser || swrlUser.isAnonymous) {
                showRequireLoginScreen('to see Swrls on your list');
                return new Promise(function (resolve, reject) {
                    resolve({ empty: true });
                });
            } else {
                return db.where("category", "==", category.id)
                    .where("later", "array-contains", swrlUser.uid)
                    .orderBy("details.title")
                    .get();
            }
        case DISCOVER:
            return db.where("category", "==", category.id)
                .orderBy("added", "desc")
                .get();
        default:
            return db.where("category", "==", category.id)
                .orderBy("added", "desc")
                .get();
    }
}

function clearList() {
    while (swrlsContainer.firstChild) {
        swrlsContainer.removeChild(swrlsContainer.firstChild);
    }
}

export function destroyList() {
    const tabs = document.getElementById('tabs');
    tabs.classList.add('hidden');
    document.getElementById('swrlList').classList.add('hidden');
    document.getElementById('messageContainer').classList.add('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    yourListTab.classList.remove('selected');
    discoverTab.classList.remove('selected');
    currentID = undefined;
    clearList();
}

/**
 * @param {Category} category
 */
function showNoSwrlsView(category) {
    document.getElementById('messageContainer').classList.remove('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    document.getElementById('message').innerText = category.noSwrlsMessage;
}

/**
 * @param {Category} category
 */
function showNoSwrlsDiscoverView(category) {
    document.getElementById('messageContainer').classList.remove('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    document.getElementById('message').innerText = category.noSwrlsDiscoverMessage;
}
