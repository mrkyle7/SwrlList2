import { showList, destroyList } from './swrlList';
import { destroySearch, showSearch, initSearchBar } from './searchResults';
import { Category, Categories } from '../constants/Category';
import { View } from '../constants/View';
import { swrlUser } from '../firebase/login';
import { showRecommendations } from './recommendations';

/**
 * @param {firebase.firestore.Firestore} firestore
 */
export default function bindHomeButtons(firestore) {

    var state = {
        view: undefined,
        selectedCategory: undefined
    }

    initSearchBar(firestore);

    //bind the section category clicks
    Categories.forEach(function (category) {
        var categoryName = Category.properties[category].name;
        var section = document.querySelector('.section.' + categoryName);
        var closeSectionButton = document.querySelector('.section.' + categoryName + ' .close');

        bindSectionClick(section, category, closeSectionButton);
        bindCloseSectionButton(closeSectionButton, category, section);
    });

    //bind the tab clicks on Swrls view
    const tabs = document.getElementById('tabs');
    const yourListTab = document.getElementById('yourListTab');
    const discoverTab = document.getElementById('discoverTab');
    const searchTab = document.getElementById('searchTab');
    bindYourListTab(yourListTab);
    bindDiscoverTab(discoverTab);
    bindSearchTab(searchTab);

    //bind the tab clicks on recommendation view

    const recommendationTabs = document.getElementById('recommendationTabs');
    const inboxTab = document.getElementById('inboxTab');
    const sentTab = document.getElementById('sentTab');

    bindInboxTab();
    bindSentTab();

    //bind the recommendation clicks

    const inboxIcon = document.getElementById('inboxDisplay');
    const recommendationList = document.getElementById('recommendationList');
    const recommendationsTitleBar = document.getElementById('recommendationsTitleBar');

    bindShowRecommendations(inboxIcon);
    bindCloseRecommendations();


    //functions

    function bindInboxTab() {
        inboxTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            inboxTab.classList.add('selected');
            sentTab.classList.remove('selected');
            showRecommendations(View.INBOX, firestore);
        })
    }
    
    function bindSentTab() {
        sentTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sentTab.classList.add('selected');
            inboxTab.classList.remove('selected');
            showRecommendations(View.SENT, firestore);
        })
    }

    function bindShowRecommendations(element) {
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('clicked show recommendations');
            recommendationTabs.classList.remove('hidden');
            recommendationList.classList.remove('hidden');
            recommendationsTitleBar.classList.remove('hidden');
            inboxTab.classList.add('selected');
            sentTab.classList.remove('selected');
            showRecommendations(View.INBOX, firestore);
        })
    }

    function bindCloseRecommendations() {
        const closeRecommendationsButton = document.getElementById('closeRecommendations');
        closeRecommendationsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            recommendationTabs.classList.add('hidden');
            recommendationList.classList.add('hidden');
            recommendationsTitleBar.classList.add('hidden');
        })
    }

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

                if (!state.view) {
                    // choose default view based on whether the user is logged in or not
                    if (!swrlUser || swrlUser.isAnonymous) {
                        state.view = View.DISCOVER;
                        discoverTab.classList.add('selected');
                    } else {
                        state.view = View.YOUR_LIST;
                        yourListTab.classList.add('selected');
                    }
                }

                if (state.view === View.YOUR_LIST) {
                    showList(category, View.YOUR_LIST, firestore);
                } else if (state.view === View.DISCOVER) {
                    showList(category, View.DISCOVER, firestore);
                } else if (state.view === View.SEARCH) {
                    showSearch(category, firestore);
                } else {
                    console.log('not set?');
                    state.view = View.DISCOVER;
                    discoverTab.classList.add('selected');
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