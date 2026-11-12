import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
export default { showList, destroyList };

import { SWRLER_LATER, SWRLER_LOVED, SWRLER_DONE } from '../constants/View';
import { Collection } from '../constants/Collection';
import { Category } from '../constants/Category';
import { swrlUser } from '../firebase/login';
import { renderSwrl } from '../components/swrl';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';
import { UIView } from './UIView';
import { StateController } from './stateController';
import { Sort } from '../constants/Sort';
import { WhereFilter } from '../constants/WhereFilter';

export class SwrlerLater extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.swrlerListScreen)
    }

    show() {
        showList(this.stateController.currentState.swrler, SWRLER_LATER, this.firestore, this.stateController);
    }

    destroy() {
        destroyList();
    }
}

export class SwrlerLoved extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.swrlerListScreen)
    }

    show() {
        showList(this.stateController.currentState.swrler, SWRLER_LOVED, this.firestore, this.stateController);
    }

    destroy() {
        destroyList();
    }
}

export class SwrlerDone extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.swrlerListScreen)
    }

    show() {
        showList(this.stateController.currentState.swrler, SWRLER_DONE, this.firestore, this.stateController);
    }

    destroy() {
        destroyList();
    }
}

/** @type {HTMLDivElement} */
// @ts-ignore
const swrlerLaterTab = document.getElementById('swrlerLaterTab');

/** @type {HTMLDivElement} */
// @ts-ignore
const swrlerLovedTab = document.getElementById('swrlerLovedTab');

/** @type {HTMLDivElement} */
// @ts-ignore
const swrlerDoneTab = document.getElementById('swrlerDoneTab');

const swrlsContainer = document.getElementById('swrlList');
let currentID;
let currentSwrler;
let currentView;

/**
 * @param {import('firebase/auth').User} swrler
 * @param {Constant} view
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
export function showList(swrler, view, firestore, stateController) {
    const tabs = document.getElementById('swrlerTabs');
    tabs.classList.remove('hidden');

    currentID = Math.random();
    const resultsID = currentID;

    if (view === SWRLER_LATER) {
        swrlerLaterTab.classList.add('selected');
    } else if (view === SWRLER_LOVED) {
        swrlerLovedTab.classList.add('selected');
    } else if (view === SWRLER_DONE) {
        swrlerDoneTab.classList.add('selected');
    }
    swrlsContainer.classList.remove('hidden');
    document.getElementById('swrlListView').classList.remove('hidden');

    if (currentSwrler !== swrler || currentView !== view) {
        clearList();
        document.getElementById('messageContainer').classList.remove('hidden');
        document.getElementById('message').innerText = 'Loading Swrls...';
        document.querySelector('#messageContainer .loadingSpinner').classList.remove('hidden');
    } else {
        document.querySelector('#swrlListView .loadingbar').classList.remove('hidden');
    }
    currentSwrler = swrler
    currentView = view;
    const swrlsRef = collection(firestore, Collection.SWRLS);
    if (swrlsRef) {
        runQuery(swrlsRef, swrler, view, stateController.currentState.sort, stateController.currentState.typeFilter)
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
                             * @param {import('firebase/firestore').QueryDocumentSnapshot} docSnapshot
                             */
                            (docSnapshot) => {
                                try {
                                    const swrl = Swrl.fromFirestore(docSnapshot.data());
                                    if (stateController.currentState.filters.every(f => f.match(swrl, swrlUser ? swrlUser.uid : undefined))) {
                                        swrls.push(swrl);
                                    }
                                } catch (error) {
                                    console.error(`Cannot get swrl ${docSnapshot.id}`);
                                    console.error(docSnapshot.data());
                                    console.error(error);
                                }
                            })
                        if (swrls.length === 0) {
                            showNoSwrlsView()
                        } else {
                            renderNextSwrls(swrls, stateController, view, firestore, true);
                        }

                    } else {
                        console.log("No Swrls found");
                        showNoSwrlsView();
                    }
                } else {
                    console.log('View was changed');
                }
            })
            .catch(function (error) {
                console.error(error);
                console.error("Couldn't get swrls!");
                showNoSwrlsView();
            })
    } else {
        if (currentID === resultsID) {
            console.log("No Swrls found");
            showNoSwrlsView();
        } else {
            console.log('View was changed');
        }
    }
}



/**
 * @param {Swrl[]} swrls
 * @param {StateController} stateController
 * @param {Constant} view
 * @param {import('firebase/firestore').Firestore} firestore
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
 * @param {import('firebase/firestore').CollectionReference} db
 * @param {import('firebase/auth').User} swrler
 * @param {Constant} view
 * @param {Sort} sort
 * @param {WhereFilter} typeFilter
 * @return {Promise}
 */
function runQuery(db, swrler, view, sort, typeFilter) {
    const listFields = new Map([[SWRLER_LATER, "later"], [SWRLER_LOVED, "loved"], [SWRLER_DONE, "done"]]);
    /** @type {import('firebase/firestore').QueryConstraint[]} */
    const constraints = [];
    if (listFields.has(view)) {
        constraints.push(where(listFields.get(view), "array-contains", swrler.uid));
    }
    constraints.push(orderBy(sort.column, sort.direction));
    if (typeFilter) constraints.push(where(typeFilter.column, '==', typeFilter.value));
    return getDocs(query(db, ...constraints));
}

function clearList() {
    while (swrlsContainer.firstChild) {
        swrlsContainer.removeChild(swrlsContainer.firstChild);
    }
}

export function destroyList() {
    const tabs = document.getElementById('swrlerTabs');
    tabs.classList.add('hidden');
    document.getElementById('swrlList').classList.add('hidden');
    document.getElementById('messageContainer').classList.add('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    document.querySelector('#swrlListView .loadingbar').classList.add('hidden');
    swrlerLaterTab.classList.remove('selected');
    swrlerLovedTab.classList.remove('selected');
    swrlerDoneTab.classList.remove('selected');
    currentID = undefined;
}

function showNoSwrlsView() {
    document.getElementById('messageContainer').classList.remove('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    document.getElementById('message').innerText = 'No Swrls to see here :(';
}


