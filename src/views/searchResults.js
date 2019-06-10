export default { showSearch, destroySearch, initSearchBar };

import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import { Category } from '../constants/Category';
import { View } from '../constants/View';
import { renderSwrl } from '../components/swrl';

var currentCategory;
var searchResultsContainer = document.querySelector('#searchResults');
var searchBar = document.querySelector('#swrlSearch');
var messageContainer = document.querySelector('#messageContainer');
var message = document.querySelector('#message');
var currentSearchID;
var resultsShowing = false;

export function showSearch(category) {
    currentCategory = category;
    searchResultsContainer.classList.remove('hidden');
    searchBar.classList.remove('hidden');
    messageContainer.classList.remove('hidden');
    message.innerText = Category.properties[category].searchMessage;
    searchBar.placeholder = Category.properties[category].searchPlaceholder;
}

export function destroySearch() {
    searchBar.value = '';
    searchResultsContainer.classList.add('hidden');
    searchBar.classList.add('hidden');
    messageContainer.classList.add('hidden');
    message.innerText = '';
    clearResults();
    currentSearchID = undefined;
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
        var searchText = e.target.value;
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

                var searchFn = Category.properties[currentCategory].search;
                searchFn(searchText, signal, currentSearchID)
                    .then(function (result) {
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
            message.innerText = Category.properties[currentCategory].searchMessage;
        }
    })
}

function clearResults() {
    while (searchResultsContainer.firstChild) {
        searchResultsContainer.removeChild(searchResultsContainer.firstChild);
    }
    resultsShowing = false;
}

function processResults(results, firestore, searchText) {
    if (results.length == 0) {
        message.innerText = 'No results found for ' + searchText;
    } else {
        messageContainer.classList.add('hidden');
        results.forEach((swrl) => {
            renderSwrl(currentCategory, View.SEARCH, swrl, firestore, searchResultsContainer);
        });
        resultsShowing = true;
    }
}