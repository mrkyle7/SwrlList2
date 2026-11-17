import { appendAttribution } from '../components/attribution';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
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
import { StateController} from './stateController';
import { Sort } from '../constants/Sort';
import { WhereFilter } from '../constants/WhereFilter';
import { getAllListEntries, getListEntry, whenListEntriesReady } from '../listeners/listEntries';
import { sortListEntries } from '../model/listEntry';
import { getLabelsFor } from '../listeners/labels';
import { matchesLabels } from '../model/labels';
import { renderCategoryStrips } from '../components/categoryStrips';
import { ensureGenres, genresFor } from '../firebase/genres';
import { matchesGenres } from '../model/genres';
import { closeTonightPicker, showTonightPicker } from '../components/tonightPicker';

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
 * @param {import('firebase/firestore').Firestore} firestore
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
    const filters = stateController.currentState.filters;
    const userId = swrlUser ? swrlUser.uid : undefined;
    const genreFilters = view === YOUR_LIST ? stateController.currentState.genreFilters : [];
    loadSwrls(category, view, stateController.currentState.sort, stateController.currentState.typeFilter, firestore)
        // filtering by genre needs every swrl's genres to hand first
        .then(async result => {
            if (genreFilters.length > 0) await ensureGenres(getAllListEntries(), firestore);
            return result;
        })
        .then(function ({ total, swrls: loaded }) {
            if (currentID === resultsID) {
                document.getElementById('messageContainer').classList.add('hidden');
                document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
                document.querySelector('#swrlListView .loadingbar').classList.add('hidden');

                clearList();
                if (total > 0) {
                    const labelFilters = stateController.currentState.labelFilters;
                    const swrls = loaded.filter(swrl => filters.every(f => f.match(swrl, userId))
                        && matchesLabels(getLabelsFor(swrl.swrlID), labelFilters)
                        && matchesGenres(genresFor(swrl.swrlID), genreFilters));
                    renderNextSwrls(swrls, stateController, view, firestore, true);
                    if (view === YOUR_LIST && swrls.length > 1) {
                        addPickBar(category, stateController);
                    }

                    if (swrlsContainer.querySelectorAll('.swrl').length == 0) {
                        console.log(view === DISCOVER ? 'No Swrls to discover' : 'No Swrls match the filters');
                        if (view === DISCOVER) {
                            showNoSwrlsDiscoverView(category);
                        } else {
                            showNoSwrlsView(category, isFiltering(stateController));
                        }
                    }
                } else {
                    console.log("No Swrls found");
                    showNoSwrlsView(category);
                }
                // What friends are into, at the top of Discover, unless I am filtering it
                const state = stateController.currentState;
                if (view === DISCOVER && !state.typeFilter && state.filters.length === 0 && state.labelFilters.length === 0 && state.genreFilters.length === 0) {
                    renderCategoryStrips(swrlsContainer, category, firestore, stateController, () => currentID === resultsID)
                        .then(() => {
                            // the strips say more than "nothing here" does
                            if (currentID === resultsID && swrlsContainer.querySelector('.categoryStrips')
                                && !swrlsContainer.querySelector('.swrl')) {
                                document.getElementById('messageContainer').classList.add('hidden');
                            }
                        });
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
}

/**
 * Your List comes from my own entries; Discover from the shared swrls
 * collection, leaving out what is already on my list or done and what I
 * deleted (both from my entries). Either way the swrls come back in the order
 * to show them. Your List swrls are built from the entries; renderSwrl then
 * fetches the shared doc of each swrl it shows (for the counts).
 *
 * @param {Category} category
 * @param {Constant} view
 * @param {Sort} sort
 * @param {WhereFilter} typeFilter
 * @param {import('firebase/firestore').Firestore} firestore
 * @return {Promise<{total: number, swrls: Swrl[]}>} total is how many there were before Discover's exclusions
 */
async function loadSwrls(category, view, sort, typeFilter, firestore) {
    if (view === YOUR_LIST) {
        if (!swrlUser || swrlUser.isAnonymous) {
            showRequireLoginScreen('to see Swrls on your list');
            return { total: 0, swrls: [] };
        }
        await whenListEntriesReady();
        const entries = sortListEntries(getAllListEntries().filter(entry =>
            entry.later && entry.category.id === category.id && (!typeFilter || entry.type.id === typeFilter.value)), sort);
        return { total: entries.length, swrls: entries.map(entry => entry.toSwrl()) };
    }

    /** @type {import('firebase/firestore').QueryConstraint[]} */
    const constraints = [where("category", "==", category.id), orderBy(sort.column, sort.direction)];
    if (typeFilter) constraints.push(where(typeFilter.column, '==', typeFilter.value));
    const [querySnapshot] = await Promise.all([
        getDocs(query(collection(firestore, Collection.SWRLS), ...constraints)),
        whenListEntriesReady()]);
    /** @type {Swrl[]} */
    const swrls = [];
    querySnapshot.forEach(
        /**
         * @param {import('firebase/firestore').QueryDocumentSnapshot} docSnapshot
         */
        (docSnapshot) => {
            try {
                const swrl = Swrl.fromFirestore(docSnapshot.data());
                if (!isOnList(swrl) && !isDeleted(swrl)) {
                    swrls.push(swrl);
                }
            } catch (error) {
                console.error(`Cannot get swrl ${docSnapshot.id}`);
                console.error(docSnapshot.data());
                console.error(error);
            }
        });
    return { total: querySnapshot.size, swrls: swrls };
}

/**
 * On my list or done, according to my own entries.
 *
 * @param {Swrl} swrl
 */
function isOnList(swrl) {
    const entry = getListEntry(swrl.swrlID);
    return entry !== undefined && (entry.later || entry.done);
}

/**
 * Deleted by me, according to my own entries.
 *
 * @param {Swrl} swrl
 */
function isDeleted(swrl) {
    const entry = getListEntry(swrl.swrlID);
    return entry !== undefined && entry.deleted;
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
    // Last, so it stays below the items and the "show more" button.
    if (swrlsContainer.querySelector('.swrl')) {
        appendAttribution(swrlsContainer, currentCategory.attribution);
    }
}

/**
 * "Can't decide?" above my list: opens the tonight picker.
 *
 * @param {Category} category
 * @param {StateController} stateController
 */
function addPickBar(category, stateController) {
    const bar = document.createElement('div');
    bar.className = 'pickBar';
    const text = document.createElement('span');
    text.textContent = "Can't decide?";
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'pickBarButton';
    open.textContent = 'Pick for me';
    open.addEventListener('click', () => showTonightPicker(category, stateController));
    bar.append(text, open);
    swrlsContainer.prepend(bar);
}

function clearList() {
    while (swrlsContainer.firstChild) {
        swrlsContainer.removeChild(swrlsContainer.firstChild);
    }
}

export function destroyList() {
    closeTonightPicker();
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
/**
 * @param {Category} category
 * @param {boolean} [filtered] whether filters are hiding what is on the list
 */
function showNoSwrlsView(category, filtered) {
    document.getElementById('messageContainer').classList.remove('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    document.getElementById('message').innerText = filtered
        ? 'Nothing on your list matches these filters. Tap the filter button to change or clear them.'
        : category.noSwrlsMessage;
}

/**
 * @param {StateController} stateController
 * @return {boolean} whether any filter is on
 */
function isFiltering(stateController) {
    const state = stateController.currentState;
    return Boolean(state.typeFilter) || state.filters.length > 0 || state.labelFilters.length > 0 || state.genreFilters.length > 0;
}

/**
 * @param {Category} category
 */
function showNoSwrlsDiscoverView(category) {
    document.getElementById('messageContainer').classList.remove('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
    document.getElementById('message').innerText = category.noSwrlsDiscoverMessage;
}
