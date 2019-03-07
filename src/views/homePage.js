var categories = ['watch', 'read', 'listen', 'other'];
import { showList, destroyList } from './swrlList';
import { destroySearch, showSearch } from './searchResults';

/**
 * @param {firebase.firestore.Firestore} firestore
 */
export default function bindHomeButtons(firestore) {

    var ViewEnum = {
        LIST: 1,
        SEARCH: 2
    }

    var state = {
        view: ViewEnum.LIST,
    }

    categories.forEach(function (category) {
        var section = document.querySelector('.section.' + category);
        var closeSectionButton = document.querySelector('.section.' + category + ' .close');
        var searchButton = document.querySelector('.section.' + category + ' .search');

        bindSectionClick(section, category, closeSectionButton, searchButton);
        bindCloseSectionButton(closeSectionButton, category, searchButton, section);
        bindSearchButton(searchButton, category);
    });

    function bindSearchButton(searchButton, category) {
        ['click', 'touchstart'].forEach(function (eventType) {
            searchButton.addEventListener(eventType, function (e) {
                if (state.view === ViewEnum.LIST) {
                    destroyList();
                    showSearch(category, firestore);
                    state.view = ViewEnum.SEARCH;
                } else if (state.view === ViewEnum.SEARCH) {
                    destroySearch();
                    showList(category, firestore);
                    state.view = ViewEnum.LIST;
                }
                e.stopPropagation();
            });
        });
    }

    function bindCloseSectionButton(closeSectionButton, category, searchButton, section) {
        ['click', 'touchstart'].forEach(function (eventType) {
            closeSectionButton.addEventListener(eventType, function (e) {
                console.log('Clicked Close for section: ' + category);
                destroyList();
                destroySearch();
                closeSectionButton.classList.add('hidden');
                searchButton.classList.add('hidden');
                restoreSections();
                section.classList.remove('selected');
                e.stopPropagation();
            });
        });
    }

    function bindSectionClick(section, category, closeSectionButton, searchButton) {
        ['click', 'touchstart'].forEach(function (eventType) {
            section.addEventListener(eventType, function () {
                console.log('Clicked section ' + category);
                section.classList.add('selected');
                clearOtherCategories(category);
                closeSectionButton.classList.remove('hidden');
                searchButton.classList.remove('hidden');
                if (state.view === ViewEnum.LIST) {
                    showList(category, firestore);
                } else if (state.view === ViewEnum.SEARCH) {
                    showSearch(category, firestore);
                }
            });
        });
    }

    function clearOtherCategories(category) {
        categories.filter(function (c) {
            return c !== category;
        }).forEach(function (c) {
            document.querySelector('.section.' + c).classList.add('hidden');
        })
    }

    function restoreSections() {
        categories.forEach(function (c) {
            document.querySelector('.section.' + c).classList.remove('hidden');
        })
    }
}