import { showList, destroyList } from './swrlList';
import { destroySearch, showSearch, initSearchBar } from './searchResults';
import { Category, Categories } from '../constants/Category';
import { View } from '../constants/View';

/**
 * @param {firebase.firestore.Firestore} firestore
 */
export default function bindHomeButtons(firestore) {

    var state = {
        view: View.LIST,
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
    function bindSearchTab(element) {
        ['click', 'touchstart'].forEach(function (eventType) {
            element.addEventListener(eventType, function (e) {
                searchTab.classList.add('selected');
                yourListTab.classList.remove('selected');
                discoverTab.classList.remove('selected');
                destroyList();
                showSearch(state.selectedCategory, firestore);
                state.view = View.SEARCH;
                e.stopPropagation();
            });
        });
    }
    function bindDiscoverTab(element) {
        ['click', 'touchstart'].forEach(function (eventType) {
            element.addEventListener(eventType, function (e) {
                searchTab.classList.remove('selected');
                yourListTab.classList.remove('selected');
                discoverTab.classList.add('selected');
                destroySearch();
                showList(state.selectedCategory, firestore);
                state.view = View.LIST;
                e.stopPropagation();
            });
        });
    }
    function bindYourListTab(element) {
        ['click', 'touchstart'].forEach(function (eventType) {
            element.addEventListener(eventType, function (e) {
                searchTab.classList.remove('selected');
                yourListTab.classList.add('selected');
                discoverTab.classList.remove('selected');
                destroySearch();
                showList(state.selectedCategory, firestore);
                state.view = View.LIST;
                e.stopPropagation();
            });
        });
    }

    function bindCloseSectionButton(closeSectionButton, category, section) {
        ['click', 'touchstart'].forEach(function (eventType) {
            closeSectionButton.addEventListener(eventType, function (e) {
                console.log('Clicked Close for section: ' + category);
                destroyList();
                destroySearch();
                tabs.classList.add('hidden');
                closeSectionButton.classList.add('hidden');
                restoreSections();
                section.classList.remove('selected');
                state.selectedCategory = undefined;
                e.stopPropagation();
            });
        });
    }

    function bindSectionClick(section, category, closeSectionButton) {
        ['click', 'touchstart'].forEach(function (eventType) {
            section.addEventListener(eventType, function () {
                if (!state.selectedCategory) {
                    console.log('Clicked section ' + category);
                    section.classList.add('selected');
                    clearOtherCategories(category);
                    closeSectionButton.classList.remove('hidden');
                    tabs.classList.remove('hidden');
                    if (state.view === View.LIST) {
                        showList(category, firestore);
                    } else if (state.view === View.SEARCH) {
                        showSearch(category, firestore);
                    }
                    state.selectedCategory = category;
                } else {
                    console.log('Section already expanded');
                }
            });
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