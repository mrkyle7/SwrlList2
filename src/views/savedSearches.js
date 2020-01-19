import { UIView } from './UIView';
import { StateController } from './stateController';
import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';
import { SavedSearch } from '../model/savedSearch';
import { showToasterMessage } from '../components/toaster';
import { State } from '../model/state';
import { SearchView } from './searchResults';

export class SavedSearches extends UIView {
    /**
    * @param {StateController} stateController
    */
    constructor(stateController) {
        super(stateController, stateController.savedSearches);
    }

    show() {
        showSavedSearches(this.firestore, this.stateController);
    }

    destroy() {
        destroySavedSearches();
    }
}

const savedSearchesView = document.getElementById('savedSearchesView');
const savedSearches = document.getElementById('savedSearches');
/** @type {HTMLTemplateElement} */
// @ts-ignore
const savedSearchTemplate = document.getElementById('savedSearch');

/**
 * 
 * @param {firebase.firestore.Firestore} firestore 
 * @param {StateController} stateController 
 * 
 */
const showSavedSearches = (firestore, stateController) => {
    savedSearchesView.classList.remove('hidden');
    clearSaved();
    showSpinner();

    firestore.collection(Collection.SAVEDSEARCHES)
        .where('uid', '==', swrlUser.uid)
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                document.getElementById('message').innerText = 'No Saved Searches';
                document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
            } else {
                savedSearches.classList.remove('hidden');
                hideSpinner();
                renderSavedSearches(querySnapshot, firestore, stateController);
            }
        })
        .catch(err => {
            console.error('Could not load saved searches');
            console.error(err);
            showErrorMessage();
        })
}

const destroySavedSearches = () => {
    savedSearchesView.classList.add('hidden');
    savedSearches.classList.add('hidden');
    clearSaved();
    hideSpinner();
}

const clearSaved = () => {
    while (savedSearches.firstChild) {
        savedSearches.removeChild(savedSearches.firstChild);
    }
}

const showSpinner = () => {
    savedSearches.classList.add('hidden');
    document.getElementById('messageContainer').classList.remove('hidden');
    document.getElementById('message').innerText = 'Loading Saved Searches...';
    document.querySelector('#messageContainer .loadingSpinner').classList.remove('hidden');
}

function renderSavedSearches(querySnapshot, firestore, stateController) {
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

function showErrorMessage() {
    savedSearches.classList.add('hidden');
    document.getElementById('message').innerText = 'Something went wrong :(';
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
}

function hideSpinner() {
    document.getElementById('messageContainer').classList.add('hidden');
    document.querySelector('#messageContainer .loadingSpinner').classList.add('hidden');
}

