export default { showSearch, destroySearch, initSearchBar };

import { Category } from '../constants/Category';
import { Type } from '../constants/Type';
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import { swrlUser } from '../firebase/login';
import showRequireLoginScreen from '../components/requireLoginScreen';
import addSwrlToList from '../actions/addSwrlToList';

var currentCategory;
var searchResultsContainer = document.querySelector('#searchResults');
var searchBar = document.querySelector('#swrlSearch');
var messageContainer = document.querySelector('#messageContainer');
var message = document.querySelector('#message');
var swrlTemplate = document.querySelector('#swrl');
var currentSearchID;
var resultsShowing = false;

export function showSearch(category) {
    currentCategory = category;
    searchResultsContainer.classList.remove('hidden');
    searchBar.classList.remove('hidden');
    messageContainer.classList.remove('hidden');
    message.innerText = Category.properties[category].searchMessage;
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
        if (searchText.length >= 3) {
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
                        message.innerText = 'No results found for ' + searchText;
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
        results.forEach((result) => {
            var swrlFragment = swrlTemplate.content.cloneNode(true);
            var swrlDiv = swrlFragment.querySelector('div');
            swrlDiv.id = result.swrlID;
            var $swrl = swrlFragment.querySelector.bind(swrlFragment);
            $swrl('.swrlImage').src = result.details.imageUrl;
            $swrl('.swrlTitle').innerText = result.details.title;
            $swrl('.swrlType').innerText = Type.properties[result.type].name;
            $swrl('.swrlAdded').classList.add(Category.properties[currentCategory].name);
            $swrl('.swrlAdd').classList.remove('hidden');
            $swrl('.swrlAdd').addEventListener('click', (e) => {
                if (!swrlUser || swrlUser.isAnonymous) {
                    showRequireLoginScreen('to add a Swrl to your list');
                } else {
                    swrlDiv.querySelector('.swrlAdd').classList.add('hidden');
                    swrlDiv.querySelector('.swrlSpinner').classList.remove('hidden');
                    addSwrlToList(result, firestore)
                        .then(function () {
                            swrlDiv.querySelector('.swrlAdded').classList.remove('hidden');
                            setTimeout(function () {
                                searchResultsContainer.removeChild(swrlDiv);
                            }, 1000)
                        }
                        )
                        .catch(function (error) {
                            console.error('Could not add to list');
                            console.error(error);
                        });
                }
            })
            searchResultsContainer.appendChild(swrlFragment);
        });
        resultsShowing = true;
    }
}