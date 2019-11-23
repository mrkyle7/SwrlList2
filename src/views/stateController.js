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
        //views
        this.homeView = new Home(this);
        this.inboxView = new InboxRecommendations(this);
        this.sentView = new SentRecommendations(this);
        this.yourListView = new YourListView(this);
        this.discoverView = new DiscoverView(this);
        this.searchView = new SearchView(this);
        this.recommendView = new Recommend(this);
        this.swrlView = new SwrlFullPage(this);
        //states
        /** @type {State[]} */
        this.previousStates = [];
        this.currentState = new State(undefined, undefined, undefined, undefined);
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
            this.currentState = new State(this.homeView, undefined, undefined, undefined);
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

        const inboxIcon = document.getElementById('inboxDisplay');
        inboxIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('clicked show recommendations');
            const inboxState = new State(this.inboxView, this.currentState.selectedCategory, this.currentState.searchTerms, this.currentState.swrl);
            this.changeState(inboxState);
        });

        const inboxTab = document.getElementById('inboxTab');
        inboxTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const inboxState = new State(this.inboxView, this.currentState.selectedCategory, this.currentState.searchTerms, this.currentState.swrl);
            this.changeState(inboxState);
        });

        const sentTab = document.getElementById('sentTab');
        sentTab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const sentState = new State(this.sentView, this.currentState.selectedCategory, this.currentState.searchTerms, this.currentState.swrl);
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

    /**
     * 
     * @param {HTMLElement} yourListTab 
     */
    _bindYourListTab(yourListTab) {
        yourListTab.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const yourListState = new State(this.yourListView, this.currentState.selectedCategory, this.currentState.searchTerms, this.currentState.swrl)
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
            const discoverState = new State(this.discoverView, this.currentState.selectedCategory, this.currentState.searchTerms, this.currentState.swrl)
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
            const searchState = new State(this.searchView, this.currentState.selectedCategory, this.currentState.searchTerms, this.currentState.swrl)
            this.changeState(searchState);
        });
    }

    /**
     * @param {Element} section
     * @param {Category} category
     */
    _bindSectionClick(section, category) {
        section.addEventListener('click', () => {

            console.log('Clicked section ' + category);

            const previousView = this.previousStates.length > 0 ?
                this.previousStates[this.previousStates.length - 1].view : undefined;

            const discoverState = new State(this.discoverView, category, this.currentState.searchTerms, this.currentState.swrl);
            const yourlistState = new State(this.yourListView, category, this.currentState.searchTerms, this.currentState.swrl);
            const searchState = new State(this.searchView, category, this.currentState.searchTerms, this.currentState.swrl);
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