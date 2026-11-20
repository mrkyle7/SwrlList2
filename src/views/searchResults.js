import { mountListToolbar, unmountListToolbar } from '../components/listToolbar';
import { appendAttribution, appendAttributions } from '../components/attribution';
import { collection, doc, getDocs, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { ALL, Category } from '../constants/Category';
import { SEARCH } from '../constants/View';
import { renderSwrl } from '../components/swrl';
import { Swrl } from '../model/swrl';
import { UIView } from './UIView';
import { StateController } from './stateController';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { showToasterMessage } from '../components/toaster';
import { searchFailureText } from '../model/searchFailure';
import { SavedSearch } from '../model/savedSearch';
import { State } from '../model/state';
import { getAllListEntries } from '../listeners/listEntries';
import { listMatches } from '../model/listMatches';

export class SearchView extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.listScreen)
    }

    show() {
        showSearch(
            this.stateController.currentState.selectedCategory,
            this.stateController.currentState.searchTerms,
            this.firestore,
            this.stateController);
    }

    destroy() {
        destroySearch()
    }
}

/** @type {Category} */
let currentCategory;
const searchView = document.getElementById('searchView');
const searchResultsContainer = document.getElementById('searchResults');
const searchResulList = document.getElementById('resultList');
const addToSavedSearch = document.getElementById('addToSavedSearch');
const addToSavedSearchContent = document.getElementById('addToSavedSearchContent');

/** @type {HTMLInputElement} */
// @ts-ignore
const searchBar = document.getElementById('swrlSearch');
const messageContainer = document.getElementById('messageContainer');
const message = document.getElementById('message');
const searching = document.getElementById('searching');
const loadingbar = searchResultsContainer.querySelector('.loadingbar');
const searchingMessage = document.getElementById('searchingMessage');
const searchTab = document.getElementById('searchTab');
const yourListTab = document.getElementById('yourListTab');
const discoverTab = document.getElementById('discoverTab');
const savedSearchesCard = document.getElementById('savedSearchesCard');
const savedSearches = document.getElementById('savedSearchesSearchView');
const tabs = document.getElementById('tabs');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const savedSearchTemplate = document.getElementById('savedSearch');


let currentSearchID;
let resultsShowing = false;
let searchDelay;
let currentSearchController;

/**
 * @param {Category} category
 * @param {string} searchText
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function showSearch(category, searchText, firestore, stateController) {
    searchView.classList.remove('hidden');
    tabs.classList.remove('hidden');
    searchBar.classList.remove('hidden');
    searchTab.classList.add('selected');
    searchBar.focus();
    searchBar.placeholder = category.searchPlaceholder;
    searchResultsContainer.classList.remove('hidden');
    // "Search everything" is not a list: only the Search tab applies.
    yourListTab.classList.toggle('hidden', category === ALL);
    discoverTab.classList.toggle('hidden', category === ALL);

    if (category !== currentCategory) {
        clearResults();
        searchBar.value = '';
        addToSavedSearch.classList.add('hidden');
    }
    currentCategory = category;

    if (!resultsShowing && (searchText === undefined || searchText.length === 0)) {
        showSavedSearchesOrSearchMessage(firestore, stateController);
    }
    if (searchText !== undefined && searchText.length > 0) {
        searchBar.value = searchText;
        runSearch(stateController, firestore);
    }
}

/**
 * 
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {StateController} stateController 
 */
function showSavedSearchesOrSearchMessage(firestore, stateController) {
    showMessage(currentCategory.searchMessage);
    getDocs(query(collection(firestore, Collection.SAVEDSEARCHES),
        where("uid", "==", swrlUser.uid),
        where("category", "==", currentCategory.id)))
        .then(querySnapshot => {
            if (!querySnapshot.empty && searchBar.value.length === 0) {
                hideAllMessages();
                savedSearchesCard.classList.remove('hidden');
                renderSavedSearches(querySnapshot, firestore, stateController);
                if (!savedSearchesExist()) {
                    showMessage(currentCategory.searchMessage);
                }
            }
        });
}

function savedSearchesExist() {
    return savedSearches.querySelector('.savedSearch');
}

/**
 * 
 * @param {import('firebase/firestore').QuerySnapshot} querySnapshot 
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {StateController} stateController 
 */
function renderSavedSearches(querySnapshot, firestore, stateController) {
    while (savedSearches.firstChild) {
        savedSearches.removeChild(savedSearches.firstChild);
    }
    querySnapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const id = docSnapshot.id;
        try {
            const savedSearch = SavedSearch.fromJson(data);
            /** @type {HTMLElement} */
            // @ts-ignore
            const fragment = savedSearchTemplate.content.cloneNode(true);
            const div = fragment.querySelector('div');
            // @ts-ignore
            fragment.querySelector('.searchCategoryIcon').src = savedSearch.category.image;
            // @ts-ignore
            fragment.querySelector('.savedSearchText').innerText = savedSearch.searchText;
            div.style.backgroundColor = savedSearch.category.colour;
            // @ts-ignore
            fragment.querySelector('.deleteSavedSearch').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showToasterMessage('Deleted saved search: ' + savedSearch.searchText);
                if (div) {
                    savedSearches.removeChild(div);
                }
                deleteDoc(doc(firestore, Collection.SAVEDSEARCHES, id));
                if (!savedSearchesExist()) {
                    console.log('No more saved searches');
                    showMessage(currentCategory.searchMessage);
                }
            });
            // @ts-ignore
            fragment.querySelector('.runSavedSearch').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showToasterMessage('Running and deleting saved search: ' + savedSearch.searchText);
                const searchView = new State(stateController.searchView);
                searchView.selectedCategory = savedSearch.category;
                searchView.searchTerms = savedSearch.searchText;
                stateController.changeState(searchView);
                deleteDoc(doc(firestore, Collection.SAVEDSEARCHES, id));
            });
            savedSearches.appendChild(fragment);
        }
        catch (err) {
            console.error('Could not render saved search');
            console.error(err);
        }
    });
}

function destroySearch() {
    unmountListToolbar();
    searchView.classList.remove('hidden');
    searchBar.classList.add('hidden');
    tabs.classList.add('hidden');
    searchTab.classList.remove('selected');
    yourListTab.classList.remove('hidden');
    discoverTab.classList.remove('hidden');
    searchResultsContainer.classList.add('hidden');
    hideAllMessages();
}

function hideAllMessages() {
    messageContainer.classList.add('hidden');
    message.innerText = '';
    searching.classList.add('hidden');
    loadingbar.classList.add('hidden');
    searchingMessage.innerText = '';
    savedSearchesCard.classList.add('hidden');
}

/**
 * @param {import('firebase/firestore').Firestore} firestore 
 * @param {StateController} stateController 
 */
export function initSearchBar(firestore, stateController) {
    addToSavedSearch.addEventListener('click', () => {
        addDoc(collection(firestore, Collection.SAVEDSEARCHES), {
            uid: swrlUser.uid,
            searchText: searchBar.value,
            category: currentCategory.id
        });
        showToasterMessage(`Added "${searchBar.value}" to saved searches`);
        cancelCurrentSearch();
        searchBar.value = '';
        stateController.currentState.searchTerms = '';
        clearResults();
        addToSavedSearch.classList.add('hidden');
        showSavedSearchesOrSearchMessage(firestore, stateController);
    })
    searchBar.addEventListener('keydown', (e) => {
        if (e.code === 'Enter') {
            console.log('enter was pressed');
            searchBar.blur();
        }
    });
    searchBar.addEventListener('input', function (e) {
        e.preventDefault();
        runSearch(stateController, firestore);
    })
}

function cancelCurrentSearch() {
    currentSearchID = undefined;
    if (currentSearchController) {
        currentSearchController.abort();
    }
    if (searchDelay) {
        clearTimeout(searchDelay);
    }
}

/**
 * @param {string} text
 */
function showMessage(text) {
    hideAllMessages();
    messageContainer.classList.remove('hidden');
    message.innerText = text;
}

/**
 * 
 * @param {StateController} stateController 
 * @param {import('firebase/firestore').Firestore} firestore 
 */
function runSearch(stateController, firestore) {
    cancelCurrentSearch();
    const searchText = searchBar.value;
    stateController.currentState.searchTerms = searchText;
    if (searchText.length > 0) {
        hideAllMessages();
        addToSavedSearch.classList.remove('hidden');
        addToSavedSearchContent.innerText = `Save "${searchText}" to search later`;
        searchDelay = setTimeout(() => {
            currentSearchController = new AbortController();
            const signal = currentSearchController.signal;
            currentSearchID = Math.random();
            if (!resultsShowing && currentSearchID !== undefined) {
                showSearchingSpinner(searchText);
            }
            else {
                loadingbar.classList.remove('hidden');
            }
            const search = currentCategory.search;
            const thisSearch = currentSearchID;
            // What is on my own lists shows at once, in every search (only
            // this category's, unless it is Search everything); then the
            // sources' results: Search everything adds each source's as it
            // answers (search/progressive.js), a category's come all together.
            // My own swrls show even when the sources fail.
            /** @type {Set<string> | undefined} the swrls showing, while results arrive */
            let shown;
            /** @param {Swrl[]} batch */
            const show = (batch) => {
                if (thisSearch !== currentSearchID) return;
                const fresh = batch.filter(swrl => !(shown && shown.has(swrl.swrlID)));
                if (fresh.length === 0) return;
                if (!shown) {
                    clearResults();
                    shown = new Set();
                }
                fresh.forEach(swrl => shown.add(swrl.swrlID));
                appendResults(fresh, firestore, stateController);
                // more may be on the way until the search finishes
                if (resultsShowing) loadingbar.classList.remove('hidden');
            };
            const searchedCategory = currentCategory;
            const mine = getAllListEntries().filter(entry => searchedCategory === ALL || entry.category === searchedCategory);
            show(listMatches(mine, searchText).map(entry => entry.toSwrl()));
            if (currentSearchID !== undefined) {
                search.run(searchText, signal, currentSearchID, searchedCategory === ALL ? show : undefined)
                    .then((result) => {
                        if (result.id === currentSearchID) {
                            loadingbar.classList.add('hidden');
                            if (shown && shown.size > 0) {
                                // below what is showing, then say what could not be searched
                                show(result.results);
                                loadingbar.classList.add('hidden');
                                if ((result.failed || []).length > 0) showToasterMessage(searchFailureText(result.failed), { kind: 'warning' });
                            } else {
                                clearResults();
                                processResults(result.results, firestore, searchText, stateController, result.failed || []);
                            }
                        }
                        else {
                            console.log('Not the current search, so ignoring the results');
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        if (thisSearch !== currentSearchID) return;
                        loadingbar.classList.add('hidden');
                        if (shown && shown.size > 0) {
                            showToasterMessage("Couldn't search for more right now", { kind: 'warning' });
                        } else {
                            showMessage("Couldn't search right now. Try again in a moment.");
                        }
                    });
            }
        }, 500);
    }
    else {
        if (currentSearchController) {
            currentSearchController.abort();
        }
        clearResults();
        addToSavedSearch.classList.add('hidden');
        showSavedSearchesOrSearchMessage(firestore, stateController);
    }
}

/**
 * @param {string} searchText
 */
function showSearchingSpinner(searchText) {
    hideAllMessages();
    searching.classList.remove('hidden');
    searchingMessage.innerText = 'Searching for ' + searchText + '...';
}

function clearResults() {
    unmountListToolbar();
    while (searchResulList.firstChild) {
        searchResulList.removeChild(searchResulList.firstChild);
    }
    resultsShowing = false;
}

/**
 * @param {Swrl[]} results
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {string} searchText
 * @param {StateController} stateController
 * @param {string[]} [failed] sources that could not be reached, named for people
 */
function processResults(results, firestore, searchText, stateController, failed = []) {
    results = results.filter(result => {
        return !stateController.currentState.typeFilter
            || result.type.id === stateController.currentState.typeFilter.value
    })
    if (results.length == 0) {
        showMessage(failed.length > 0 ? "Couldn't search right now. Try again in a moment." : 'No results found for ' + searchText);
    } else {
        // some sources answered: show what they found, and say what is missing
        if (failed.length > 0) showToasterMessage(searchFailureText(failed), { kind: 'warning' });
        resultsShowing = true;
        hideAllMessages();
        // over the results only: with none, the saved searches card sits there
        mountListToolbar(searchResultsContainer);
        results.forEach((swrl) => {
            renderSwrl(stateController, SEARCH, swrl, firestore, searchResulList);
        });
        // Part of the results, so it is only there when results are.
        if (currentCategory === ALL) {
            appendAttributions(searchResulList, results.map(swrl => swrl.type.attribution));
        } else {
            appendAttribution(searchResulList, currentCategory.attribution);
        }
    }
}

/**
 * Adds results below those showing (Search everything, as each source
 * answers), keeping the data sources' credits at the end.
 *
 * @param {Swrl[]} results
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {StateController} stateController
 */
function appendResults(results, firestore, stateController) {
    const typeFilter = stateController.currentState.typeFilter;
    results = results.filter(result => !typeFilter || result.type.id === typeFilter.value);
    if (results.length === 0) return;
    if (!resultsShowing) {
        resultsShowing = true;
        hideAllMessages();
        mountListToolbar(searchResultsContainer);
    }
    const credits = [...searchResulList.querySelectorAll(':scope > .attribution')];
    credits.forEach(credit => credit.remove());
    results.forEach(swrl => renderSwrl(stateController, SEARCH, swrl, firestore, searchResulList));
    appendAttributions(searchResulList, results.map(swrl => swrl.type.attribution));
    // the credits of earlier batches too, once each
    credits.forEach(credit => {
        if (![...searchResulList.querySelectorAll(':scope > .attribution')].some(existing => existing.isEqualNode(credit))) {
            searchResulList.appendChild(credit);
        }
    });
}