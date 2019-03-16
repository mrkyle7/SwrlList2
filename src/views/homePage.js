import { showList, destroyList } from './swrlList';
import { destroySearch, showSearch, initSearchBar } from './searchResults';
import { Category, Categories } from '../constants/Category';
import { View } from '../constants/View';

/**
 * @param {firebase.firestore.Firestore} firestore
 */
export default function bindHomeButtons(firestore) {

    var state = {
        view: View.YOUR_LIST,
        selectedCategory: undefined
    }

    initSearchBar(firestore);

    Categories.forEach(function (category) {
        var categoryName = Category.properties[category].name;
        var section = document.querySelector('.section.' + categoryName);
        var closeSectionButton = document.querySelector('.section.' + categoryName + ' .close');

        bindSectionClick(section, category, closeSectionButton);
        bindCloseSectionButton(closeSectionButton, category, section);
    });

    var tabs = document.querySelector('#tabs');
    var yourListTab = document.querySelector('#yourListTab');
    var discoverTab = document.querySelector('#discoverTab');
    var searchTab = document.querySelector('#searchTab');
    bindYourListTab(yourListTab);
    bindDiscoverTab(discoverTab);
    bindSearchTab(searchTab);

    yourListTab.classList.add('selected');

    //functions
    function bindYourListTab(element) {
        element.addEventListener('click', function (e) {
            searchTab.classList.remove('selected');
            yourListTab.classList.add('selected');
            discoverTab.classList.remove('selected');
            destroySearch();
            showList(state.selectedCategory, View.YOUR_LIST, firestore);
            state.view = View.YOUR_LIST;
            e.stopPropagation();
            e.preventDefault();
        });
    }
    function bindDiscoverTab(element) {
        element.addEventListener('click', function (e) {
            searchTab.classList.remove('selected');
            yourListTab.classList.remove('selected');
            discoverTab.classList.add('selected');
            destroySearch();
            showList(state.selectedCategory, View.DISCOVER, firestore);
            state.view = View.DISCOVER;
            e.stopPropagation();
            e.preventDefault();
        });
    }
    function bindSearchTab(element) {
        element.addEventListener('click', function (e) {
            if (state.view === View.SEARCH) {
                console.log('Search already selected');
            } else {
                searchTab.classList.add('selected');
                yourListTab.classList.remove('selected');
                discoverTab.classList.remove('selected');
                destroyList();
                showSearch(state.selectedCategory, firestore);
                state.view = View.SEARCH;
                e.stopPropagation();
                e.preventDefault();
            }
        });
    }
    function bindCloseSectionButton(closeSectionButton, category, section) {
        ['click', 'touchstart'].forEach(function (eventType) {
            closeSectionButton.addEventListener(eventType, function (e) {
                e.stopPropagation();
                e.preventDefault();
                console.log('Clicked Close for section: ' + category);
                destroyList();
                destroySearch();
                tabs.classList.add('hidden');
                closeSectionButton.classList.add('hidden');
                restoreSections();
                section.classList.remove('selected');
                state.selectedCategory = undefined;
            });
        });
    }

    function bindSectionClick(section, category, closeSectionButton) {
        section.addEventListener('click', function () {
            if (!state.selectedCategory) {
                console.log('Clicked section ' + category);
                section.classList.add('selected');
                clearOtherCategories(category);
                closeSectionButton.classList.remove('hidden');
                tabs.classList.remove('hidden');
                if (state.view === View.YOUR_LIST) {
                    showList(category, View.YOUR_LIST, firestore);
                } else if (state.view === View.DISCOVER) {
                    showList(category, View.DISCOVER, firestore);
                } else if (state.view === View.SEARCH) {
                    showSearch(category, firestore);
                }
                state.selectedCategory = category;
            } else {
                console.log('Section already expanded');
            }
        });
    }

    function clearOtherCategories(category) {
        Categories.filter(function (c) {
            return c !== category;
        }).forEach(function (c) {
            var categoryName = Category.properties[c].name;
            document.querySelector('.section.' + categoryName).classList.add('hidden');
        })
    }

    function restoreSections() {
        Categories.forEach(function (c) {
            var categoryName = Category.properties[c].name;
            document.querySelector('.section.' + categoryName).classList.remove('hidden');
        })
    }
}