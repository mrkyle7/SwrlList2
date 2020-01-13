import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import { Category } from '../constants/Category';
import { SEARCH } from '../constants/View';
import { renderSwrl } from '../components/swrl';
import { Swrl } from '../model/swrl';
import { UIView } from './UIView';
import { StateController } from './stateController';

export class SearchView extends UIView {
    /**
     * @param {StateController} stateController
     */
    constructor(stateController) {
        super(stateController, stateController.listScreen)
    }

    show() {
        showSearch(this.stateController.currentState.selectedCategory);
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
/** @type {HTMLInputElement} */
// @ts-ignore
const searchBar = document.getElementById('swrlSearch');
const messageContainer = document.getElementById('messageContainer');
const message = document.getElementById('message');
const searching = document.getElementById('searching');
const loadingbar = searchResultsContainer.querySelector('.loadingbar');
const searchingMessage = document.getElementById('searchingMessage');
const searchTab = document.getElementById('searchTab');
let currentSearchID;
let resultsShowing = false;

/**
 * @param {Category} category
 */
function showSearch(category) {
    searchView.classList.remove('hidden');
    const tabs = document.getElementById('tabs');
    tabs.classList.remove('hidden');
    if (category !== currentCategory) {
        clearResults();
        searchBar.value = '';
    }
    currentCategory = category;
    searchResultsContainer.classList.remove('hidden');
    searchBar.classList.remove('hidden');
    searchTab.classList.add('selected');
    searchBar.focus();
    if (!resultsShowing) {
        messageContainer.classList.remove('hidden');
        message.innerText = category.searchMessage;
    }
    searchBar.placeholder = category.searchPlaceholder;
}


function destroySearch() {
    searchView.classList.remove('hidden');
    const tabs = document.getElementById('tabs');
    tabs.classList.add('hidden');
    searchResultsContainer.classList.add('hidden');
    searchBar.classList.add('hidden');
    messageContainer.classList.add('hidden');
    message.innerText = '';
    searching.classList.add('hidden');
    loadingbar.classList.add('hidden');
    searchingMessage.innerText = '';
    searchTab.classList.remove('selected');
}

/**
 * @param {firebase.firestore.Firestore} firestore 
 * @param {StateController} stateController 
 */
export function initSearchBar(firestore, stateController) {
    var searchDelay;
    var currentSearchController;
    searchBar.addEventListener('keydown', (e) => {
        if (e.code === 'Enter') {
            console.log('enter was pressed');
            searchBar.blur();
        }
    });
    searchBar.addEventListener('input', function (e) {
        /** @type {HTMLInputElement} */
        // @ts-ignore
        const target = e.target;
        const searchText = target.value;
        if (searchDelay) {
            clearTimeout(searchDelay);
        }
        if (searchText.length > 0) {
            stateController.currentState.searchTerms = searchText;
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
                } else {
                    loadingbar.classList.remove('hidden');
                }

                const search = currentCategory.search;
                if (currentSearchID !== undefined) {
                    search.run(searchText, signal, currentSearchID)
                        .then(
                            (result) => {
                                if (result.id === currentSearchID) {
                                    clearResults();
                                    processResults(result.results, firestore, searchText, stateController);
                                } else {
                                    console.log('Not the current search, so ignoring the results');
                                }
                            })
                        .catch((err) => {
                            //TODO: add better view for errors?
                            console.error(err);
                            messageContainer.classList.remove('hidden');
                            message.innerText = 'Error - No results found for ' + searchText;
                        })
                }
            }, 500)

        } else {
            if (currentSearchController) {
                currentSearchController.abort();
            }
            clearResults();
            messageContainer.classList.remove('hidden');
            message.innerText = currentCategory.searchMessage;
        }
    })
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