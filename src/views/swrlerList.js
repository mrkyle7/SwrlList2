import { mountListToolbar, unmountListToolbar } from '../components/listToolbar';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
export default { showList, destroyList };

import { SWRLER_LATER, SWRLER_LOVED, SWRLER_DONE, SWRLER_IN_PROGRESS } from '../constants/View';
import { listEntriesPath } from '../constants/Collection';
import { Category } from '../constants/Category';
import { swrlUser } from '../firebase/login';
import { renderSwrl } from '../components/swrl';
import { Constant } from '../constants/Constant';
import { emptySwrlerMessage } from '../model/visibilitySettings';
import { Swrl } from '../model/swrl';
import { ListEntry, sortListEntries, visibilitiesViewerMayQuery } from '../model/listEntry';
import { whenListEntriesReady } from '../listeners/listEntries';
import { addFriendsChangeListener, isFriend, whenFriendsReady } from '../listeners/friends';
import { renderFriendControl } from '../components/friendControl';
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

export class SwrlerInProgress extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.swrlerListScreen)
    }

    show() {
        showList(this.stateController.currentState.swrler, SWRLER_IN_PROGRESS, this.firestore, this.stateController);
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

/** @type {HTMLDivElement} */
// @ts-ignore
const swrlerInProgressTab = document.getElementById('swrlerInProgressTab');

const swrlsContainer = document.getElementById('swrlList');
let currentID;
let currentSwrler;
let currentView;
/** The friendship the current list was loaded with, so a change reloads it. */
let loadedAsFriend;
let unsubscribeFriends;
/** @type {HTMLElement} */
let friendBar;

/**
 * @param {import('firebase/auth').User} swrler
 * @param {Constant} view
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
export function showList(swrler, view, firestore, stateController) {
    const tabs = document.getElementById('swrlerTabs');
    tabs.classList.remove('hidden');
    mountListToolbar(swrlsContainer, friendBar);

    currentID = Math.random();
    const resultsID = currentID;

    if (view === SWRLER_LATER) {
        swrlerLaterTab.classList.add('selected');
    } else if (view === SWRLER_LOVED) {
        swrlerLovedTab.classList.add('selected');
    } else if (view === SWRLER_DONE) {
        swrlerDoneTab.classList.add('selected');
    } else if (view === SWRLER_IN_PROGRESS) {
        swrlerInProgressTab.classList.add('selected');
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
    showFriendBar(swrler, firestore);
    if (unsubscribeFriends) unsubscribeFriends();
    unsubscribeFriends = addFriendsChangeListener(() => {
        if (currentID !== resultsID) return;
        renderFriendBar(swrler, firestore);
        // Becoming (or ceasing to be) a friend changes which entries may be read.
        if (loadedAsFriend !== undefined && loadedAsFriend !== isFriend(swrler.uid)) {
            showList(swrler, view, firestore, stateController);
        }
    });
    const filters = stateController.currentState.filters;
    const userId = swrlUser ? swrlUser.uid : undefined;
    loadEntries(swrler, view, stateController.currentState.sort, stateController.currentState.typeFilter, firestore)
        .then(function (entries) {
            if (currentID === resultsID) {
                document.getElementById('messageContainer').classList.add('hidden');
                document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
                document.querySelector('#swrlListView .loadingbar').classList.add('hidden');

                clearList();
                // renderSwrl fetches the shared swrl of each card it shows (for the counts)
                const swrls = entries.map(entry => entry.toSwrl()).filter(swrl => filters.every(f => f.match(swrl, userId)));
                if (swrls.length === 0) {
                    console.log("No Swrls found");
                    showNoSwrlsView(swrler);
                } else {
                    renderNextSwrls(swrls, stateController, view, firestore, true);
                }
            } else {
                console.log('View was changed');
            }
        })
        .catch(function (error) {
            console.error(error);
            console.error("Couldn't get swrls!");
            showNoSwrlsView(swrler);
        })
}

/**
 * The swrler's entries for this tab, sorted, limited to what I may see. The
 * visibility constraint is part of the query because rules are not filters:
 * a query that could return something I may not read is refused outright.
 * A friend's pages also include the entries with `friends` visibility.
 *
 * @param {import('firebase/auth').User} swrler
 * @param {Constant} view
 * @param {Sort} sort
 * @param {WhereFilter} typeFilter
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<ListEntry[]>}
 */
async function loadEntries(swrler, view, sort, typeFilter, firestore) {
    const listFields = new Map([[SWRLER_LATER, "later"], [SWRLER_IN_PROGRESS, "inProgress"], [SWRLER_LOVED, "loved"], [SWRLER_DONE, "done"]]);
    /** @type {import('firebase/firestore').QueryConstraint[]} */
    const constraints = [];
    if (listFields.has(view)) {
        constraints.push(where(listFields.get(view), "==", true));
    }
    if (typeFilter) constraints.push(where(typeFilter.column, '==', typeFilter.value));
    // Friendship comes from the friends listener: wait for its first snapshot
    // (it resolves at once for anonymous viewers, who are never friends).
    await whenFriendsReady();
    loadedAsFriend = isFriend(swrler.uid);
    const visibilities = visibilitiesViewerMayQuery(swrlUser ? swrlUser.uid : undefined, swrler.uid, loadedAsFriend);
    if (visibilities) constraints.push(where('visibility', 'in', visibilities));
    const [querySnapshot] = await Promise.all([
        getDocs(query(collection(firestore, listEntriesPath(swrler.uid).join('/')), ...constraints)),
        whenListEntriesReady()]);
    /** @type {ListEntry[]} */
    const entries = [];
    querySnapshot.forEach(
        /**
         * @param {import('firebase/firestore').QueryDocumentSnapshot} docSnapshot
         */
        (docSnapshot) => {
            try {
                entries.push(ListEntry.fromFirestore(docSnapshot.data()));
            } catch (error) {
                console.error(`Cannot get list entry ${docSnapshot.id}`);
                console.error(docSnapshot.data());
                console.error(error);
            }
        });
    return sortListEntries(entries, sort);
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

function clearList() {
    [...swrlsContainer.childNodes].forEach(node => {
        if (!(node instanceof HTMLElement && node.id === 'listToolbar')) swrlsContainer.removeChild(node);
    });
    // the friendship bar stays at the top of the list, above the toolbar
    if (friendBar && !friendBar.classList.contains('hidden')) swrlsContainer.prepend(friendBar);
}

/**
 * Creates the friendship bar (once) and shows the control for this swrler.
 *
 * @param {import('firebase/auth').User} swrler
 * @param {import('firebase/firestore').Firestore} firestore
 */
function showFriendBar(swrler, firestore) {
    if (!friendBar) {
        // @ts-ignore
        friendBar = document.getElementById('swrlerFriendBar').content.cloneNode(true).querySelector('.swrlerFriendBar');
    }
    renderFriendBar(swrler, firestore);
}

/**
 * Shows "Add friend" / "Request sent" / "Accept" / "Friends" above the list,
 * or nothing on my own page and for anonymous viewers.
 *
 * @param {import('firebase/auth').User} swrler
 * @param {import('firebase/firestore').Firestore} firestore
 */
function renderFriendBar(swrler, firestore) {
    renderFriendControl(friendBar, swrler.uid, firestore);
    if (friendBar.classList.contains('hidden')) {
        if (friendBar.parentNode) friendBar.parentNode.removeChild(friendBar);
    } else if (friendBar.parentNode !== swrlsContainer) {
        swrlsContainer.insertBefore(friendBar, swrlsContainer.firstChild);
    }
}

export function destroyList() {
    unmountListToolbar();
    if (unsubscribeFriends) unsubscribeFriends();
    unsubscribeFriends = undefined;
    if (friendBar && friendBar.parentNode) friendBar.parentNode.removeChild(friendBar);
    loadedAsFriend = undefined;
    const tabs = document.getElementById('swrlerTabs');
    tabs.classList.add('hidden');
    document.getElementById('swrlList').classList.add('hidden');
    document.getElementById('messageContainer').classList.add('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    document.querySelector('#swrlListView .loadingbar').classList.add('hidden');
    swrlerLaterTab.classList.remove('selected');
    swrlerLovedTab.classList.remove('selected');
    swrlerDoneTab.classList.remove('selected');
    swrlerInProgressTab.classList.remove('selected');
    currentID = undefined;
}

/**
 * The empty state, worded for the viewer's relationship to the swrler. Nothing
 * here says whether entries exist that the viewer may not see.
 *
 * @param {import('firebase/auth').User} swrler
 */
function showNoSwrlsView(swrler) {
    document.getElementById('messageContainer').classList.remove('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    document.getElementById('message').innerText = emptySwrlerMessage(
        swrlUser ? swrlUser.uid : undefined, swrler.uid, swrler.displayName, isFriend(swrler.uid));
}


