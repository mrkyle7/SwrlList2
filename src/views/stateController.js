import { Home } from "./homePage";
import { State } from "../model/state";
import { InboxRecommendations, SentRecommendations } from "./recommendations";
import { initSearchBar, SearchView } from "./searchResults";
import { Category, Categories } from "../constants/Category";
import { swrlUser } from "../firebase/login";
import { YourListView, DiscoverView } from "./swrlList";
import { Recommend } from "./recommend";
import { HomeScreen } from "../screens/homeScreen";
import { ListScreen } from "../screens/listScreen";
import { RecommendationsScreen } from "../screens/recommendationsScreen";
import { RecommendScreen } from "../screens/recommendScreen";
import { SwrlScreen } from "../screens/swrlScreen";
import { SwrlFullPage } from "./swrlFullPage";
import { SavedSearchesScreen } from "../screens/savedSearchesScreen";
import { SavedSearches } from "./savedSearches";
import { alphabetical, Sort, sortFromId } from "../constants/Sort";
import { Filter, RECOMMENDED_FILTER, filterFromId } from "../constants/Filter";

export let sort = alphabetical;
/** @type {Filter[]} */
export let filters = [];

export class StateController {
    /**
     * @param {firebase.firestore.Firestore} firestore
     */
    constructor(firestore) {
        this.firestore = firestore;
        //screens
        this.homeScreen = new HomeScreen(this);
        this.listScreen = new ListScreen(this);
        this.recommendationsScreen = new RecommendationsScreen(this);
        this.recommendScreen = new RecommendScreen(this);
        this.swrlScreen = new SwrlScreen(this);
        this.savedSearches = new SavedSearchesScreen(this);
        //views
        this.homeView = new Home(this);
        this.inboxView = new InboxRecommendations(this);
        this.sentView = new SentRecommendations(this);
        this.yourListView = new YourListView(this);
        this.discoverView = new DiscoverView(this);
        this.searchView = new SearchView(this);
        this.recommendView = new Recommend(this);
        this.swrlView = new SwrlFullPage(this);
        this.savedSearchesView = new SavedSearches(this);
        //states
        /** @type {State[]} */
        this.previousStates = [];
        this.currentState = new State(undefined);
    }

    /**
    * @param {State} newState
    */
    changeState(newState) {
        if (this.currentState.view !== undefined) {
            this.currentState.view.destroy();
            if (this.previousStates.length === 0) {
                this.previousStates.push(this.currentState);
            } else if (this.currentState.view.screen !== newState.view.screen) {
                this.previousStates.push(this.currentState);
            }
        }
        this.currentState = newState;
        newState.view.show();
        this._updateTitleBar();
    }

    showPreviousScreen() {
        if (this.previousStates.length === 0) {
            this.currentState = new State(this.homeView);
            this.homeView.show();
        } else {
            this.currentState.view.destroy();
            const previousState = this.previousStates.pop();
            this.currentState = previousState;
            previousState.view.show();
        }
        this._updateTitleBar();
    }

    _updateTitleBar() {
        this.currentState.view.screen.updateTitleBar();
    }

    initialiseAllViews() {
        const backButton = document.getElementById('backButton');
        backButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.showPreviousScreen();
        })

        this._initMenuItems();

        const inboxIcon = document.getElementById('inboxDisplay');
        inboxIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const inboxState = new State(this.inboxView);
            this.changeState(inboxState);
        });

        const filterButton = document.getElementById('filterButton');
        filterButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const fade = document.getElementById('fade')
            fade.classList.remove('hidden');
            const filters = document.getElementById('filters')
            filters.classList.remove('hidden');
        })

        const filterApplyButton = document.getElementById('submitFilters');
        filterApplyButton.addEventListener('click', this.applyFilters());
        const fade = document.getElementById('fade');
        fade.addEventListener('click', this.applyFilters());

        const inboxTab = document.getElementById('inboxTab');
        inboxTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const inboxState = new State(this.inboxView);
            this.changeState(inboxState);
        });

        const sentTab = document.getElementById('sentTab');
        sentTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const sentState = new State(this.sentView);
            this.changeState(sentState);
        });

        //bind the tab clicks on Swrls view

        /** @type {HTMLDivElement} */
        // @ts-ignore
        const yourListTab = document.getElementById('yourListTab');

        /** @type {HTMLDivElement} */
        // @ts-ignore
        const discoverTab = document.getElementById('discoverTab');

        /** @type {HTMLDivElement} */
        // @ts-ignore
        const searchTab = document.getElementById('searchTab');

        initSearchBar(this.firestore, this);

        this._bindYourListTab(yourListTab);
        this._bindDiscoverTab(discoverTab);
        this._bindSearchTab(searchTab);

        //bind the section category clicks
        Categories.forEach(
            /**
             * @param {Category} category
             */
            (category) => {
                const categoryName = category.name;
                const section = document.querySelector('.section.' + categoryName);

                this._bindSectionClick(section, category);
            });
    }

    applyFilters() {
        return (e) => {
            e.stopPropagation();
            e.preventDefault();
            const fade = document.getElementById('fade');
            fade.classList.add('hidden');
            const filterPopup = document.getElementById('filters');
            filterPopup.classList.add('hidden');
            const checkedSort = document.querySelector('input[name="sort"]:checked');
            if (checkedSort) {
                const selectedSort = sortFromId(parseInt(checkedSort.value));
                if (selectedSort) {
                    sort = selectedSort;
                }
            }
            filters = [];
            const selectedFilters = document.querySelectorAll('input[name="filter"]:checked');
            selectedFilters.forEach(selectedFilter => {
                const filter = filterFromId(parseInt(selectedFilter.value));
                if (filter) {
                    filters.push(filter);
                } 
            })
            if (this.currentState.view.screen === this.listScreen) {
                const refreshState = new State(this.currentState.view);
                refreshState.selectedCategory = this.currentState.selectedCategory;
                refreshState.searchTerms = this.currentState.searchTerms;
                this.changeState(refreshState);
            }
        };
    }

    _initMenuItems() {
        const savedSearchMenuItem = document.getElementById('savedSearchesMenu');
        const openSavedSearch = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._closeMenu();
            this.changeState(new State(this.savedSearchesView))
        }
        savedSearchMenuItem.addEventListener('click', openSavedSearch);
        savedSearchMenuItem.addEventListener('touchstart', openSavedSearch);
    }

    _closeMenu() {
        /** @type {HTMLInputElement} */
        const openSidebarMenuElement = document.querySelector("#openSidebarMenu");
        openSidebarMenuElement.checked = false;
        const fade = document.getElementById('fade');
        fade.classList.add('hidden');
    }

    /**
     * 
     * @param {HTMLElement} yourListTab 
     */
    _bindYourListTab(yourListTab) {
        yourListTab.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const yourListState = new State(this.yourListView)
            yourListState.selectedCategory = this.currentState.selectedCategory;
            yourListState.searchTerms = this.currentState.searchTerms;
            this.changeState(yourListState);
        });
    }
    /**
     * @param {HTMLElement} discoverTab 
     */
    _bindDiscoverTab(discoverTab) {
        discoverTab.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const discoverState = new State(this.discoverView);
            discoverState.selectedCategory = this.currentState.selectedCategory;
            discoverState.searchTerms = this.currentState.searchTerms;
            this.changeState(discoverState);
        });
    }
    /**
     * @param {HTMLElement} searchTab 
     */
    _bindSearchTab(searchTab) {
        searchTab.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const searchState = new State(this.searchView)
            searchState.selectedCategory = this.currentState.selectedCategory;
            searchState.searchTerms = this.currentState.searchTerms;
            this.changeState(searchState);
        });
    }

    /**
     * @param {Element} section
     * @param {Category} category
     */
    _bindSectionClick(section, category) {
        section.addEventListener('click', () => {

            const previousView = this.previousStates.length > 0 ?
                this.previousStates[this.previousStates.length - 1].view : undefined;

            const discoverState = new State(this.discoverView);
            discoverState.selectedCategory = category;
            discoverState.searchTerms = this.currentState.searchTerms;
            const yourlistState = new State(this.yourListView);
            yourlistState.selectedCategory = category;
            yourlistState.searchTerms = this.currentState.searchTerms;
            const searchState = new State(this.searchView);
            searchState.selectedCategory = category;
            searchState.searchTerms = this.currentState.searchTerms;
            if (previousView === undefined) {
                // choose default view based on whether the user is logged in or not
                if (!swrlUser || swrlUser.isAnonymous) {
                    this.changeState(discoverState);
                } else {
                    this.changeState(yourlistState);
                }
            } else {
                if (previousView === this.yourListView) {
                    this.changeState(yourlistState);
                } else if (previousView === this.discoverView) {
                    this.changeState(discoverState);
                } else if (previousView === this.searchView) {
                    this.changeState(searchState)
                } else {
                    this.changeState(yourlistState);
                }
            }
        });
    }
}