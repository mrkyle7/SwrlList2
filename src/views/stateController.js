import { Home } from "./homePage";
import { State } from "../model/state";
import { InboxRecommendations, SentRecommendations } from "./recommendations";
import { initSearchBar, SearchView } from "./searchResults";
import { Category, Categories, WATCH, READ, LISTEN, PLAY } from "../constants/Category";
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
import { FriendsScreen } from "../screens/friendsScreen";
import { Friends } from "./friends";
import { SettingsScreen } from "../screens/settingsScreen";
import { Settings } from "./settings";
import { AboutScreen } from "../screens/aboutScreen";
import { About } from "./about";
import { sortFromId } from "../constants/Sort";
import { getAllMyLabels } from "../listeners/labels";
import { hasLabel } from "../model/labels";
import { genreCounts, genresToShow, searchGenres } from "../model/genres";
import { ensureGenres, genresFor } from "../firebase/genres";
import { getAllListEntries } from "../listeners/listEntries";

/** How many genres show before "Show all", and from how many the search box appears. */
const FEW_GENRES = 8;
const SEARCHABLE_GENRES = 12;
import { filterFromId } from "../constants/Filter";
import { whereFilterFromId } from "../constants/WhereFilter";
import { SwrlerListScreen } from "../screens/swrlerListScreen";
import { SwrlerLater as SwrlerLaterView, SwrlerLoved as SwrlerLovedView, SwrlerDone as SwrlerDoneView } from "./swrlerList";
import { UIView } from "./UIView";

export class StateController {
    /**
     * @param {import('firebase/firestore').Firestore} firestore
     */
    constructor(firestore) {
        this.firestore = firestore;
        //screens
        this.homeScreen = new HomeScreen(this);
        this.listScreen = new ListScreen(this);
        this.swrlerListScreen = new SwrlerListScreen(this);
        this.recommendationsScreen = new RecommendationsScreen(this);
        this.recommendScreen = new RecommendScreen(this);
        this.swrlScreen = new SwrlScreen(this);
        this.savedSearches = new SavedSearchesScreen(this);
        this.friendsScreen = new FriendsScreen(this);
        this.settingsScreen = new SettingsScreen(this);
        this.aboutScreen = new AboutScreen(this);
        //views
        this.homeView = new Home(this);
        this.inboxView = new InboxRecommendations(this);
        this.sentView = new SentRecommendations(this);
        this.yourListView = new YourListView(this);
        this.discoverView = new DiscoverView(this);
        this.swrlerLaterView = new SwrlerLaterView(this);
        this.swrlerLovedView = new SwrlerLovedView(this);
        this.swrlerDoneView = new SwrlerDoneView(this);
        this.searchView = new SearchView(this);
        this.recommendView = new Recommend(this);
        this.swrlView = new SwrlFullPage(this);
        this.savedSearchesView = new SavedSearches(this);
        this.friendsView = new Friends(this);
        this.settingsView = new Settings(this);
        this.aboutView = new About(this);
        //states
        /** @type {State[]} */
        this.previousStates = [];
        this.currentState = new State(undefined);
        /** Genres ticked in the filter sheet while it is open, lower case -> as written. @type {Map<string, string>} */
        this._genreChoice = new Map();
        this._genreVisit = 0;
    }

    /**
    * @param {State} newState
    */
    changeState(newState) {
        let newScreen = false
        if (this.currentState.view !== undefined) {
            this.currentState.view.destroy();
            if (this.previousStates.length === 0) {
                this.previousStates.push(this.currentState);
                newScreen = true
            } else if (this.currentState.view.screen !== newState.view.screen) {
                this.previousStates.push(this.currentState);
                newScreen = true;
            }
        }
        this.currentState = newState;
        newState.view.screen.updateLocationHistory(newScreen);
        newState.view.show();
        this._updateTitleBar();
    }

    /**
    * @param {State} newState
    */
    replaceState(newState) {
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
        this._updateFilterIndicator();
    }

    /**
     * A count on the filter icon while any filter is on (type, swrled to
     * me, labels, genres), so a short list never looks like a short list.
     */
    _updateFilterIndicator() {
        const state = this.currentState;
        const count = (state.typeFilter ? 1 : 0) + state.filters.length + state.labelFilters.length + state.genreFilters.length;
        const badge = document.getElementById('filterCount');
        badge.textContent = String(count);
        badge.classList.toggle('hidden', count === 0);
        document.getElementById('filterButton').setAttribute('alt',
            count === 0 ? 'Filter and sort' : `Filter and sort, ${count} ${count === 1 ? 'filter' : 'filters'} on`);
    }

    initialiseAllViews() {
        const backButton = document.getElementById('backButton');
        backButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.hidefilters();
            window.history.back();
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
            const typeFilters = document.querySelectorAll('input[name="whereFilter"]');
            typeFilters.forEach(filter => {
                //@ts-ignore
                if (filter.value === "-1") {
                    //@ts-ignore
                    filter.checked = this.currentState.typeFilter === undefined;
                } else {
                    filter.classList.add('hidden');
                    const label = document.querySelector(`label[for="${filter.id}"]`)
                    if (label) label.classList.add('hidden')
                    if ((this.currentState.selectedCategory &&
                        //@ts-ignore
                        this.currentState.selectedCategory.typeFilters.some(tf => tf.id === parseInt(filter.value)))
                        || this.currentState.view.screen === this.swrlerListScreen) {
                        filter.classList.remove('hidden')
                        if (label) label.classList.remove('hidden')
                    }
                    //@ts-ignore
                    filter.checked = this.currentState.typeFilter && this.currentState.typeFilter.id === parseInt(filter.value);
                }
            })
            document.querySelectorAll('input[name="sort"]')
                //@ts-ignore
                .forEach(s => s.checked = this.currentState.sort.id === parseInt(s.value))
            document.querySelectorAll('input[name="filter"]')
                //@ts-ignore
                .forEach(input => input.checked = this.currentState.filters.some(f => f.id === parseInt(input.value)))

            this._showLabelFilters();
            this._showGenreFilters();

            const filters = document.getElementById('filters')
            filters.classList.remove('hidden');
        })

        const filterApplyButton = document.getElementById('submitFilters');
        filterApplyButton.addEventListener('click', this.applyFilters());
        const fade = document.getElementById('fade');
        fade.addEventListener('click', this.applyFilters());
        // Clear all: every filter off (sort stays), and show the list at once
        document.getElementById('clearFilters').addEventListener('click', (e) => {
            document.querySelectorAll('#filters input[type="checkbox"]').forEach(input => {
                /** @type {HTMLInputElement} */ (input).checked = false;
            });
            /** @type {HTMLInputElement} */ (document.getElementById('allTypes')).checked = true;
            this._genreChoice = new Map();
            this.applyFilters()(e);
        });

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

        this.bindYourListTab(yourListTab);
        this.bindDiscoverTab(discoverTab);
        this.bindSearchTab(searchTab);

        /** @type {HTMLDivElement} */
        // @ts-ignore
        const swrlerLaterTab = document.getElementById('swrlerLaterTab');

        /** @type {HTMLDivElement} */
        // @ts-ignore
        const swrlerLovedTab = document.getElementById('swrlerLovedTab');

        /** @type {HTMLDivElement} */
        // @ts-ignore
        const swrlerDoneTab = document.getElementById('swrlerDoneTab');

        this.bindSwrlerTab(swrlerLaterTab, this.swrlerLaterView);
        this.bindSwrlerTab(swrlerLovedTab, this.swrlerLovedView);
        this.bindSwrlerTab(swrlerDoneTab, this.swrlerDoneView);

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
            this.hidefilters();
            const checkedSort = document.querySelector('input[name="sort"]:checked');
            if (checkedSort) {
                //@ts-ignore
                const selectedSort = sortFromId(parseInt(checkedSort.value));
                if (selectedSort) {
                    this.currentState.sort = selectedSort;
                }
            }
            this.currentState.filters = [];
            const selectedFilters = document.querySelectorAll('input[name="filter"]:checked');
            selectedFilters.forEach(selectedFilter => {
                //@ts-ignore
                const filter = filterFromId(parseInt(selectedFilter.value));
                if (filter) {
                    this.currentState.filters.push(filter);
                }
            })
            this.currentState.genreFilters = [...this._genreChoice.values()];
            this.currentState.labelFilters = [];
            document.querySelectorAll('input[name="labelFilter"]:checked')
                //@ts-ignore
                .forEach(input => this.currentState.labelFilters.push(input.value));
            const typeFilters = document.querySelectorAll('input[name="whereFilter"]:checked');
            typeFilters.forEach(tf => {
                //@ts-ignore
                if (tf.value === "-1") this.currentState.typeFilter = undefined
                //@ts-ignore
                const whereFilter = whereFilterFromId(parseInt(tf.value));
                if (whereFilter) this.currentState.typeFilter = whereFilter;
            })
            if (this.currentState.view.screen === this.listScreen ||
                this.currentState.view.screen === this.swrlerListScreen) {

                const refreshState = new State(this.currentState.view);
                refreshState.selectedCategory = this.currentState.selectedCategory;
                refreshState.searchTerms = this.currentState.searchTerms;
                refreshState.sort = this.currentState.sort;
                refreshState.filters = this.currentState.filters;
                refreshState.labelFilters = this.currentState.labelFilters;
                refreshState.genreFilters = this.currentState.genreFilters;
                refreshState.typeFilter = this.currentState.typeFilter;
                refreshState.swrler = this.currentState.swrler;
                this.changeState(refreshState);
            }
        };
    }

    /**
     * Lists my labels as checkboxes in the filter popup. Only on my own
     * lists: labels are mine, so they mean nothing on someone else's.
     */
    _showLabelFilters() {
        const section = document.getElementById('labelFilters');
        const list = document.getElementById('labelFilterList');
        while (list.firstChild) list.removeChild(list.firstChild);
        const labels = this.currentState.view.screen === this.listScreen ? getAllMyLabels() : [];
        section.classList.toggle('hidden', labels.length === 0);
        labels.forEach((label, i) => {
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.name = 'labelFilter';
            input.id = 'labelFilter' + i;
            input.value = label;
            input.checked = hasLabel(this.currentState.labelFilters, label);
            const text = document.createElement('label');
            text.htmlFor = input.id;
            text.textContent = label;
            // input then label, side by side: the label is styled as a chip
            list.appendChild(input);
            list.appendChild(text);
        });
    }

    /**
     * The genres on my list in this category, as chips with how many swrls
     * have each. Lists can have dozens, so it starts with the most common few
     * (and any already chosen); "Show all" opens the rest with a search box.
     * Only on my own list: the genres come from my swrls.
     */
    _showGenreFilters() {
        const section = document.getElementById('genreFilters');
        const list = document.getElementById('genreFilterList');
        /** @type {HTMLInputElement} */
        // @ts-ignore
        const search = document.getElementById('genreSearch');
        /** @type {HTMLButtonElement} */
        // @ts-ignore
        const more = document.getElementById('genreMore');
        const none = document.getElementById('genreNone');
        /** lower case -> genre as written */
        this._genreChoice = new Map(this.currentState.genreFilters.map(g => [g.toLocaleLowerCase(), g]));
        section.classList.add('hidden');
        if (this.currentState.view !== this.yourListView) return;
        const category = this.currentState.selectedCategory;
        const entries = getAllListEntries().filter(e => e.later && !e.deleted && e.category.id === category.id);
        const visit = this._genreVisit = (this._genreVisit || 0) + 1;
        ensureGenres(entries, this.firestore).then(() => {
            if (visit !== this._genreVisit) return;
            const counts = genreCounts(entries.map(e => genresFor(e.swrlID)));
            if (counts.length === 0) return;
            section.classList.remove('hidden');
            let expanded = false;
            search.value = '';
            const render = () => {
                const shown = expanded ? searchGenres(counts, search.value) : genresToShow(counts, [...this._genreChoice.values()], FEW_GENRES);
                while (list.firstChild) list.removeChild(list.firstChild);
                shown.forEach(({ genre, count }, i) => {
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.id = 'genreFilter' + i;
                    input.checked = this._genreChoice.has(genre.toLocaleLowerCase());
                    input.addEventListener('change', () => {
                        if (input.checked) this._genreChoice.set(genre.toLocaleLowerCase(), genre);
                        else this._genreChoice.delete(genre.toLocaleLowerCase());
                    });
                    const text = document.createElement('label');
                    text.htmlFor = input.id;
                    text.textContent = genre;
                    const number = document.createElement('span');
                    number.className = 'chipCount';
                    number.textContent = String(count);
                    text.appendChild(number);
                    list.append(input, text);
                });
                none.classList.toggle('hidden', shown.length > 0);
                search.classList.toggle('hidden', !expanded || counts.length <= SEARCHABLE_GENRES);
                more.classList.toggle('hidden', counts.length <= FEW_GENRES);
                more.textContent = expanded ? 'Show fewer' : `Show all ${counts.length} genres`;
                more.setAttribute('aria-expanded', String(expanded));
            };
            more.onclick = () => {
                expanded = !expanded;
                search.value = '';
                render();
                if (expanded && !search.classList.contains('hidden')) search.focus();
            };
            search.oninput = render;
            render();
        });
    }

    hidefilters() {
        const fade = document.getElementById('fade');
        fade.classList.add('hidden');
        const filterPopup = document.getElementById('filters');
        filterPopup.classList.add('hidden');
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
        
        const friendsMenuItem = document.getElementById('friendsMenu');
        const openFriends = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._closeMenu();
            if (swrlUser && !swrlUser.isAnonymous) {
                this.changeState(new State(this.friendsView));
            }
        }
        friendsMenuItem.addEventListener('click', openFriends);
        friendsMenuItem.addEventListener('touchstart', openFriends);

        const settingsMenuItem = document.getElementById('settingsMenu');
        const openSettings = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._closeMenu();
            if (swrlUser && !swrlUser.isAnonymous) {
                this.changeState(new State(this.settingsView));
            }
        }
        settingsMenuItem.addEventListener('click', openSettings);
        settingsMenuItem.addEventListener('touchstart', openSettings);

        const aboutMenuItem = document.getElementById('aboutMenu');
        const openAbout = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._closeMenu();
            this.changeState(new State(this.aboutView));
        }
        aboutMenuItem.addEventListener('click', openAbout);
        aboutMenuItem.addEventListener('touchstart', openAbout);

        const currentUserMenuItem = document.getElementById('currentUserMenu');
        const openCurrentUserScreen = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._closeMenu();
            if (swrlUser && !swrlUser.isAnonymous) {
                const swrlerState = new State(this.swrlerLaterView);
                swrlerState.swrler = swrlUser;
                this.changeState(swrlerState);
            }
        }
        currentUserMenuItem.addEventListener('click', openCurrentUserScreen);
        currentUserMenuItem.addEventListener('touchstart', openCurrentUserScreen);
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
    bindYourListTab(yourListTab) {
        yourListTab.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const yourListState = new State(this.yourListView)
            yourListState.selectedCategory = this.currentState.selectedCategory;
            yourListState.searchTerms = this.currentState.searchTerms;
            yourListState.sort = this.currentState.sort;
            yourListState.typeFilter = this.currentState.typeFilter;
            yourListState.filters = this.currentState.filters
            yourListState.labelFilters = this.currentState.labelFilters;
            yourListState.genreFilters = this.currentState.genreFilters;
            this.changeState(yourListState);
        });
    }
    /**
     * @param {HTMLElement} discoverTab 
     */
    bindDiscoverTab(discoverTab) {
        discoverTab.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const discoverState = new State(this.discoverView);
            discoverState.selectedCategory = this.currentState.selectedCategory;
            discoverState.searchTerms = this.currentState.searchTerms;
            discoverState.sort = this.currentState.sort;
            discoverState.typeFilter = this.currentState.typeFilter;
            discoverState.filters = this.currentState.filters
            discoverState.labelFilters = this.currentState.labelFilters;
            discoverState.genreFilters = this.currentState.genreFilters;
            this.changeState(discoverState);
        });
    }
    /**
     * @param {HTMLElement} searchTab 
     */
    bindSearchTab(searchTab) {
        searchTab.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const searchState = new State(this.searchView)
            searchState.selectedCategory = this.currentState.selectedCategory;
            searchState.searchTerms = this.currentState.searchTerms;
            searchState.sort = this.currentState.sort;
            searchState.typeFilter = this.currentState.typeFilter;
            searchState.filters = this.currentState.filters
            searchState.labelFilters = this.currentState.labelFilters;
            searchState.genreFilters = this.currentState.genreFilters;
            this.changeState(searchState);
        });
    }

    /**
     * @param {HTMLElement} searchTab
     * @param {UIView} view
     */
    bindSwrlerTab(searchTab, view) {
        searchTab.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const state = new State(view)
            state.swrler = this.currentState.swrler;
            state.sort = this.currentState.sort;
            state.typeFilter = this.currentState.typeFilter;
            state.filters = this.currentState.filters
            state.labelFilters = this.currentState.labelFilters;
            state.genreFilters = this.currentState.genreFilters;
            this.changeState(state);
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