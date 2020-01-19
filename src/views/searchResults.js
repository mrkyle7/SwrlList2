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
    if (category !== currentCategory) {
        clearResults();
        searchBar.value = '';
        addToSavedSearch.classList.add('hidden');
    }
    currentCategory = category;
    searchResultsContainer.classList.remove('hidden');
    searchBar.classList.remove('hidden');
    searchTab.classList.add('selected');
    searchBar.focus();
    searchBar.placeholder = category.searchPlaceholder;
    if (!resultsShowing && (searchText === undefined || searchText.length === 0)) {
        messageContainer.classList.remove('hidden');
        message.innerText = category.searchMessage;

        showSavedSearches(firestore, stateController);
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
function showSavedSearches(firestore, stateController) {
    firestore.collection(Collection.SAVEDSEARCHES)
        .where("uid", "==", swrlUser.uid)
        .where("category", "==", currentCategory.id)
        .get()
        .then(querySnapshot => {
            while (savedSearches.firstChild) {
                savedSearches.removeChild(savedSearches.firstChild);
            }
            if (!querySnapshot.empty) {
                savedSearchesCard.classList.remove('hidden');
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
                            if (!savedSearches.querySelector('.savedSearch')) {
                                console.log('No more saved searches');
                                savedSearchesCard.classList.add('hidden');
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
                if (savedSearches.childNodes.length === 0) {
                    savedSearchesCard.classList.add('hidden');
                }
            }
        });
}

function destroySearch() {
    searchView.classList.remove('hidden');
    searchBar.classList.add('hidden');
    tabs.classList.add('hidden');
    searchResultsContainer.classList.add('hidden');
    messageContainer.classList.add('hidden');
    message.innerText = '';
    searching.classList.add('hidden');
    loadingbar.classList.add('hidden');
    searchingMessage.innerText = '';
    searchTab.classList.remove('selected');
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
        searchBar.value = '';
        stateController.currentState.searchTerms = '';
        addToSavedSearch.classList.add('hidden');
        clearResults();
        showSavedSearches(firestore, stateController);
        currentSearchID = undefined;
        if (currentSearchController) {
            currentSearchController.abort();
        }
        searching.classList.add('hidden');
        loadingbar.classList.add('hidden');
        messageContainer.classList.remove('hidden');
        message.innerText = currentCategory.searchMessage;
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

/**
 * 
 * @param {StateController} stateController 
 * @param {firebase.firestore.Firestore} firestore 
 */
function runSearch(stateController, firestore) {
    const searchText = searchBar.value;
    if (searchDelay) {
        clearTimeout(searchDelay);
    }
    stateController.currentState.searchTerms = searchText;
    if (searchText.length > 0) {
        savedSearchesCard.classList.add('hidden');
        addToSavedSearch.classList.remove('hidden');
        addToSavedSearchContent.innerText = `Save "${searchText}" to search later`;
        searchDelay = setTimeout(() => {
            if (currentSearchController) {
                currentSearchController.abort();
            }
            currentSearchController = new AbortController();
            const signal = currentSearchController.signal;
            currentSearchID = Math.random();
            if (!resultsShowing && currentSearchID !== undefined) {
                messageContainer.classList.add('hidden');
                searching.classList.remove('hidden');
                searchingMessage.innerText = 'Searching for ' + searchText + '...';
            }
            else {
                loadingbar.classList.remove('hidden');
            }
            const search = currentCategory.search;
            if (currentSearchID !== undefined) {
                search.run(searchText, signal, currentSearchID)
                    .then((result) => {
                        if (result.id === currentSearchID) {
                            savedSearchesCard.classList.add('hidden');
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
                        messageContainer.classList.remove('hidden');
                        message.innerText = 'Error - No results found for ' + searchText;
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
        showSavedSearches(firestore, stateController);
        messageContainer.classList.remove('hidden');
        message.innerText = currentCategory.searchMessage;
    }
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
    searching.classList.add('hidden');
    loadingbar.classList.add('hidden');
    if (results.length == 0) {
        messageContainer.classList.remove('hidden');
        message.innerText = 'No results found for ' + searchText;
    } else {
        resultsShowing = true;
        messageContainer.classList.add('hidden');
        results.forEach((swrl) => {
            renderSwrl(stateController, SEARCH, swrl, firestore, searchResulList);
        });
    }
}