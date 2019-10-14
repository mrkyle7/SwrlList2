export default { showSearch, destroySearch, initSearchBar };

import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import { Category } from '../constants/Category';
import { SEARCH } from '../constants/View';
import { renderSwrl } from '../components/swrl';
import { Swrl } from '../model/swrl';

/** @type {Category} */
let currentCategory;
const searchResultsContainer = document.getElementById('searchResults');
/** @type {HTMLInputElement} */
// @ts-ignore
const searchBar = document.getElementById('swrlSearch');
const messageContainer = document.getElementById('messageContainer');
const message = document.getElementById('message');
let currentSearchID;
let resultsShowing = false;

/**
 * @param {Category} category
 */
export function showSearch(category) {
    currentCategory = category;
    searchResultsContainer.classList.remove('hidden');
    searchBar.classList.remove('hidden');
    searchBar.focus();
    if (!resultsShowing) {
        messageContainer.classList.remove('hidden');
        message.innerText = category.searchMessage;
    }
    searchBar.placeholder = category.searchPlaceholder;
}

/**
 * 
 * @param {Boolean} shouldClearResults 
 */
export function destroySearch(shouldClearResults) {
    searchResultsContainer.classList.add('hidden');
    searchBar.classList.add('hidden');
    messageContainer.classList.add('hidden');
    message.innerText = '';
    if (shouldClearResults) {
        searchBar.value = '';
        clearResults();
        currentSearchID = undefined;
    }
}

/**
 * @param {firebase.firestore.Firestore} firestore 
 */
export function initSearchBar(firestore) {
    var searchDelay;
    var currentSearchController;
    searchBar.addEventListener('keydown', function (e) {
        if (e.code === 'Enter') {
            console.log('enter was pressed');
            searchBar.blur();
        }
    });
    searchBar.addEventListener('input', function (e) {
        /** @type {HTMLInputElement} */
        // @ts-ignore
        const target = e.target;
        var searchText = target.value;
        if (searchDelay) {
            clearTimeout(searchDelay);
        }
        if (searchText.length > 0) {
            searchDelay = setTimeout(function () {
                if (currentSearchController) {
                    currentSearchController.abort();
                }
                currentSearchController = new AbortController();
                var signal = currentSearchController.signal;
                currentSearchID = Math.random();

                if (!resultsShowing) {
                    messageContainer.classList.remove('hidden');
                    message.innerText = 'Searching for ' + searchText + '...';
                }

                const search = currentCategory.search;
                search.run(searchText, signal, currentSearchID)
                    .then(
                        function (result) {
                            if (result.id === currentSearchID) {
                                clearResults();
                                processResults(result.results, firestore, searchText);
                            } else {
                                console.log('Not the current search, so ignoring the results');
                            }
                        })
                    .catch(function (err) {
                        //TODO: add better view for errors?
                        console.error(err);
                        messageContainer.classList.remove('hidden');
                        message.innerText = 'Error - No results found for ' + searchText;
                    })
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
    while (searchResultsContainer.firstChild) {
        searchResultsContainer.removeChild(searchResultsContainer.firstChild);
    }
    resultsShowing = false;
}

/**
 * 
 * @param {Swrl[]} results 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {string} searchText 
 */
function processResults(results, firestore, searchText) {
    if (results.length == 0) {
        message.innerText = 'No results found for ' + searchText;
    } else {
        messageContainer.classList.add('hidden');
        results.forEach((swrl) => {
            renderSwrl(currentCategory, SEARCH, swrl, firestore, searchResultsContainer);
        });
        resultsShowing = true;
    }
}