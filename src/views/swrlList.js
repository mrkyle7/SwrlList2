export default { showList, destroyList };

import { YOUR_LIST, DISCOVER } from '../constants/View';
import { Collection } from '../constants/Collection';
import { Category } from '../constants/Category';
import { swrlUser } from '../firebase/login';
import swrl, { renderSwrl } from '../components/swrl';
import showRequireLoginScreen from '../components/requireLoginScreen';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';
import { UIView } from './UIView';
import { StateController, sort } from './stateController';
import { Sort, recentlyUpdated, alphabetical, recentlyAdded } from '../constants/Sort';

export class YourListView extends UIView {
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

export class DiscoverView extends UIView {
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

const swrlsContainer = document.getElementById('swrlList');
let currentID;
let currentCategory;
let currentView;

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
    const resultsID = currentID;

    if (view === YOUR_LIST) {
        yourListTab.classList.add('selected');
    } else if (view === DISCOVER) {
        discoverTab.classList.add('selected');
    }
    swrlsContainer.classList.remove('hidden');
    document.getElementById('swrlListView').classList.remove('hidden');

    if (currentCategory !== category || currentView !== view) {
        clearList();
        document.getElementById('messageContainer').classList.remove('hidden');
        document.getElementById('message').innerText = 'Loading Swrls...';
        document.querySelector('#messageContainer .loadingSpinner').classList.remove('hidden');
    } else {
        document.querySelector('#swrlListView .loadingbar').classList.remove('hidden');
    }
    currentCategory = category
    currentView = view;
    const swrlsRef = firestore.collection(Collection.SWRLS);
    if (swrlsRef) {
        runQuery(swrlsRef, category, view)
            .then(function (querySnapshot) {
                if (currentID === resultsID) {
                    document.getElementById('messageContainer').classList.add('hidden');
                    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
                    document.querySelector('#swrlListView .loadingbar').classList.add('hidden');

                    clearList();
                    if (!querySnapshot.empty) {
                        const swrls = [];
                        querySnapshot.forEach(
                            /**
                             * @param {firebase.firestore.QueryDocumentSnapshot} docSnapshot
                             */
                            (docSnapshot) => {
                                try {
                                    const swrl = Swrl.fromFirestore(docSnapshot.data());
                                    if (!(view === DISCOVER && (isOnList(swrl) || isDeleted(swrl)))) {
                                        swrls.push(swrl);
                                    }
                                } catch (error) {
                                    console.error(`Cannot get swrl ${docSnapshot.id}`);
                                    console.error(docSnapshot.data());
                                    console.error(error);
                                }
                            })
                        renderNextSwrls(swrls, stateController, view, firestore, true);

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

/**
 * @param {Swrl[]} swrls
 * @param {StateController} stateController
 * @param {Constant} view
 * @param {firebase.firestore.Firestore} firestore
 * @param {Boolean} firstLoad
 */
function renderNextSwrls(swrls, stateController, view, firestore, firstLoad) {
    const numberToRender = firstLoad ? stateController.currentState.numberOfSwrlsToDisplay : 20;
    const end = swrls.length > numberToRender ? numberToRender : swrls.length;
    const swrlsToRender = swrls.slice(0, end);
    swrlsToRender.forEach(swrl => renderSwrl(stateController, view, swrl, firestore, swrlsContainer));
    if (swrls.length > numberToRender) {
        /** @type {HTMLElement} */
        // @ts-ignore
        const showMoreSwrls = document.getElementById('showMoreSwrls').content.cloneNode(true);
        const div = showMoreSwrls.querySelector('div');
        div.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            swrlsContainer.removeChild(div);
            stateController.currentState.numberOfSwrlsToDisplay = stateController.currentState.numberOfSwrlsToDisplay + 20;
            renderNextSwrls(swrls.slice(numberToRender, swrls.length), stateController, view, firestore, false);
        })
        swrlsContainer.appendChild(showMoreSwrls);
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
                    .orderBy(sort.column, sort.direction)
                    .get();
            }
        case DISCOVER:
            return db.where("category", "==", category.id)
                .orderBy(sort.column, sort.direction)
                .get();
        default:
            return db.where("category", "==", category.id)
                .orderBy(sort.column, sort.direction)
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
    document.querySelector('#swrlListView .loadingbar').classList.add('hidden');
    yourListTab.classList.remove('selected');
    discoverTab.classList.remove('selected');
    currentID = undefined;
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
