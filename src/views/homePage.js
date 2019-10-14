import { showList, destroyList } from './swrlList';
import { destroySearch, showSearch, initSearchBar } from './searchResults';
import { Categories, Category } from '../constants/Category';
import { INBOX, SENT, YOUR_LIST, DISCOVER, SEARCH } from '../constants/View';
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

    //Use this lock to prevent double clicking on close then reopen
    /** @type {Boolean} */
    let canReopen = true;

    initSearchBar(firestore);

    //bind the section category clicks
    Categories.forEach(function (category) {
        var categoryName = category.name;
        var section = document.querySelector('.section.' + categoryName);
        var closeSectionButton = document.querySelector('.section.' + categoryName + ' .close');

        bindSectionClick(section, category, closeSectionButton);
        bindCloseSectionButton(closeSectionButton, category, section);
    });

    //bind the tab clicks on Swrls view
    const tabs = document.getElementById('tabs');

    /** @type {HTMLDivElement} */
    // @ts-ignore
    const yourListTab = document.getElementById('yourListTab');

    /** @type {HTMLDivElement} */
    // @ts-ignore
    const discoverTab = document.getElementById('discoverTab');

    /** @type {HTMLDivElement} */
    // @ts-ignore
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

    /** @type {HTMLDivElement} */
    // @ts-ignore
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
            showRecommendations(INBOX, firestore);
        })
    }

    function bindSentTab() {
        sentTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sentTab.classList.add('selected');
            inboxTab.classList.remove('selected');
            showRecommendations(SENT, firestore);
        })
    }

    /**
     * @param {HTMLDivElement} element
     */
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
            showRecommendations(INBOX, firestore);
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

    /**
     * @param {HTMLDivElement} element
     */
    function bindYourListTab(element) {
        element.addEventListener('click', function (e) {
            searchTab.classList.remove('selected');
            yourListTab.classList.add('selected');
            discoverTab.classList.remove('selected');
            destroySearch(false);
            showList(state.selectedCategory, YOUR_LIST, firestore);
            state.view = YOUR_LIST;
            e.stopPropagation();
            e.preventDefault();
        });
    }
    /**
     * @param {HTMLDivElement} element
     */
    function bindDiscoverTab(element) {
        element.addEventListener('click', function (e) {
            searchTab.classList.remove('selected');
            yourListTab.classList.remove('selected');
            discoverTab.classList.add('selected');
            destroySearch(false);
            showList(state.selectedCategory, DISCOVER, firestore);
            state.view = DISCOVER;
            e.stopPropagation();
            e.preventDefault();
        });
    }
    /**
     * @param {HTMLDivElement} element
     */
    function bindSearchTab(element) {
        element.addEventListener('click', function (e) {
            if (state.view === SEARCH) {
                console.log('Search already selected');
            } else {
                searchTab.classList.add('selected');
                yourListTab.classList.remove('selected');
                discoverTab.classList.remove('selected');
                destroyList();
                showSearch(state.selectedCategory);
                state.view = SEARCH;
                e.stopPropagation();
                e.preventDefault();
            }
        });
    }
    /**
     * @param {Element} closeSectionButton
     * @param {Category} category
     * @param {Element} section
     */
    function bindCloseSectionButton(closeSectionButton, category, section) {
        ['click', 'touchstart'].forEach(function (eventType) {
            closeSectionButton.addEventListener(eventType, function (e) {
                canReopen = false;
                console.log('Locked Reopen');
                setTimeout(() => {
                    canReopen = true;
                    console.log('unlocked reopen');
                }, 200);
                e.stopPropagation();
                e.preventDefault();
                console.log('Clicked Close for section: ' + category);
                destroyList();
                destroySearch(true);
                tabs.classList.add('hidden');
                closeSectionButton.classList.add('hidden');
                restoreSections();
                section.classList.remove('selected');
                state.selectedCategory = undefined;
            });
        });
    }

    /**
     * @param {Element} section
     * @param {Category} category
     * @param {Element} closeSectionButton
     */
    function bindSectionClick(section, category, closeSectionButton) {
        section.addEventListener('click', function () {
            if (!canReopen) {
                console.log('cannot open: locked for reopening');
            } else if (state.selectedCategory) {
                console.log('cannot open: Section already expanded');
            } else {
                console.log('Clicked section ' + category);
                section.classList.add('selected');
                clearOtherCategories(category);
                closeSectionButton.classList.remove('hidden');
                tabs.classList.remove('hidden');

                if (!state.view) {
                    // choose default view based on whether the user is logged in or not
                    if (!swrlUser || swrlUser.isAnonymous) {
                        state.view = DISCOVER;
                        discoverTab.classList.add('selected');
                    } else {
                        state.view = YOUR_LIST;
                        yourListTab.classList.add('selected');
                    }
                }

                if (state.view === YOUR_LIST) {
                    showList(category, YOUR_LIST, firestore);
                } else if (state.view === DISCOVER) {
                    showList(category, DISCOVER, firestore);
                } else if (state.view === SEARCH) {
                    showSearch(category);
                } else {
                    console.log('not set?');
                    state.view = DISCOVER;
                    discoverTab.classList.add('selected');
                }
                state.selectedCategory = category;
            }
        });
    }

    /**
     * @param {Category} category
     */
    function clearOtherCategories(category) {
        Categories.filter(function (c) {
            return c !== category;
        }).forEach(function (c) {
            var categoryName = c.name;
            document.querySelector('.section.' + categoryName).classList.add('hidden');
        })
    }

    function restoreSections() {
        Categories.forEach(function (c) {
            var categoryName = c.name;
            document.querySelector('.section.' + categoryName).classList.remove('hidden');
        })
    }
}