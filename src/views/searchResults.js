import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import { Category } from '../constants/Category';
import { SEARCH } from '../constants/View';
import { renderSwrl } from '../components/swrl';
import { Swrl } from '../model/swrl';
import { UIView } from './UIView';
import { StateController } from './stateController';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { showToasterMessage } from '../components/toaster';
import { SavedSearch } from '../model/savedSearch';
import { State } from '../model/state';

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
 * @param {firebase.firestore.Firestore} firestore
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
 * @param {firebase.firestore.Firestore} firestore 
 * @param {StateController} stateController 
 */
function showSavedSearchesOrSearchMessage(firestore, stateController) {
    showMessage(currentCategory.searchMessage);
    firestore.collection(Collection.SAVEDSEARCHES)
        .where("uid", "==", swrlUser.uid)
        .where("category", "==", currentCategory.id)
        .get()
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
 * @param {firebase.firestore.QuerySnapshot} querySnapshot 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {StateController} stateController 
 */
function renderSavedSearches(querySnapshot, firestore, stateController) {
    while (savedSearches.firstChild) {
        savedSearches.removeChild(savedSearches.firstChild);
    }
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
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
                firestore.collection(Collection.SAVEDSEARCHES).doc(id).delete();
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
                stateController.changeState(new State(stateController.searchView, savedSearch.category, savedSearch.searchText, undefined));
                firestore.collection(Collection.SAVEDSEARCHES).doc(id).delete();
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
    searchView.classList.remove('hidden');
    searchBar.classList.add('hidden');
    tabs.classList.add('hidden');
    searchTab.classList.remove('selected');
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
 * @param {firebase.firestore.Firestore} firestore 
 * @param {StateController} stateController 
 */
export function initSearchBar(firestore, stateController) {
    addToSavedSearch.addEventListener('click', () => {
        firestore.collection(Collection.SAVEDSEARCHES).add({
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
 * @param {firebase.firestore.Firestore} firestore 
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
            if (currentSearchID !== undefined) {
                search.run(searchText, signal, currentSearchID)
                    .then((result) => {
                        if (result.id === currentSearchID) {
                            clearResults();
                            processResults(result.results, firestore, searchText, stateController);
                        }
                        else {
                            console.log('Not the current search, so ignoring the results');
                        }
                    })
                    .catch((err) => {
                        //TODO: add better view for errors?
                        console.error(err);
                        showMessage('Error - No results found for ' + searchText)
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
    while (searchResulList.firstChild) {
        searchResulList.removeChild(searchResulList.firstChild);
    }
    resultsShowing = false;
}

/**
 * @param {Swrl[]} results
 * @param {firebase.firestore.Firestore} firestore
 * @param {string} searchText
 * @param {StateController} stateController
 */
function processResults(results, firestore, searchText, stateController) {
    if (results.length == 0) {
        showMessage('No results found for ' + searchText);
    } else {
        resultsShowing = true;
        hideAllMessages();
        results.forEach((swrl) => {
            renderSwrl(stateController, SEARCH, swrl, firestore, searchResulList);
        });
    }
}