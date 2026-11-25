import { Home } from "./homePage";
import { State } from "../model/state";
import { InboxRecommendations, SentRecommendations } from "./recommendations";
import { initSearchBar, SearchView } from "./searchResults";
import { Category, Categories, WATCH, READ, LISTEN, PLAY, ALL } from "../constants/Category";
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
import { getAllListEntries, getListView } from "../listeners/listEntries";
import { activeFilterCount, listViewFromId } from "../model/listView";
import setListView from "../actions/setListView";
import { applyListView, bindListToolbar, setFilterCount } from "../components/listToolbar";
import { showToasterMessage } from "../components/toaster";
import { initDesktopSidebar, setActiveSidebarItem } from "../components/desktopSidebar";
import { initPhoneNav, setActivePhoneNavItem } from "../components/phoneNav";
import { initQuickAdd } from "../components/quickAdd";

/** How many genres show before "Show all", and from how many the search box appears. */
const FEW_GENRES = 8;
const SEARCHABLE_GENRES = 12;
import { filterFromId, withoutYourListOnlyFilters } from "../constants/Filter";
import { progressWords } from "../model/progress";
import { categoryWords } from "../model/categoryWords";
import { whereFilterFromId } from "../constants/WhereFilter";
import { SwrlerListScreen } from "../screens/swrlerListScreen";
import { SwrlerLater as SwrlerLaterView, SwrlerLoved as SwrlerLovedView, SwrlerDone as SwrlerDoneView, SwrlerInProgress as SwrlerInProgressView } from "./swrlerList";
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
        this.swrlerInProgressView = new SwrlerInProgressView(this);
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
        this._updateDesktop();
    }

    /**
     * For the desktop layout: which sidebar item is the current screen, the
     * screen's name on <body data-screen> (the stylesheet hides the top bar on
     * home), and the category's colour and icon for the tile by the title.
     */
    _updateDesktop() {
        const state = this.currentState;
        const screen = state.view.screen;
        /** @type {string | undefined} */
        let key;
        let name = 'other';
        /** @type {Category | undefined} */
        let category;
        if (screen === this.homeScreen) {
            key = 'home'; name = 'home';
        } else if (screen === this.listScreen) {
            category = state.selectedCategory; name = 'list';
            key = category === ALL ? 'search' : category ? category.name : undefined;
        } else if (screen === this.swrlScreen) {
            category = state.swrl ? state.swrl.category : undefined; key = category ? category.name : undefined; name = 'swrl';
        } else if (screen === this.recommendationsScreen) {
            key = 'swrls'; name = 'recommendations';
        } else if (screen === this.friendsScreen) {
            key = 'friends'; name = 'friends';
        } else if (screen === this.savedSearches) {
            key = 'saved'; name = 'saved';
        } else if (screen === this.settingsScreen) {
            key = 'settings'; name = 'settings';
        } else if (screen === this.aboutScreen) {
            key = 'about'; name = 'about';
        } else if (screen === this.swrlerListScreen) {
            name = 'swrler';
        }
        setActiveSidebarItem(key);
        setActivePhoneNavItem(key);
        document.body.dataset.screen = name;
        const header = document.getElementById('header');
        const tile = category && category.image && category !== ALL;
        header.classList.toggle('hasTitleTile', Boolean(tile));
        if (tile) {
            header.style.setProperty('--title-tile', category.colour);
            // from the site root: the stylesheet is injected, so a relative path would follow the page's URL
            header.style.setProperty('--title-icon', `url(/${category.image})`);
        }
    }

    /** From the desktop sidebar: a category's list, as its tile on the home screen opens it. */
    _openCategory(name) {
        const category = Categories.find(c => c.name === name);
        if (!category) return;
        const signedIn = swrlUser && !swrlUser.isAnonymous;
        const state = new State(signedIn ? this.yourListView : this.discoverView);
        state.selectedCategory = category;
        this.changeState(state);
    }

    /**
     * Search everything, with the cursor in the box: the quickest way to add
     * something. Called from a tap, so focusing here also brings up the phone's
     * keyboard. From a category's search it keeps the words typed.
     */
    openSearchEverything() {
        const current = this.currentState;
        const onSearch = current.view === this.searchView;
        if (!(onSearch && current.selectedCategory === ALL)) {
            const state = new State(this.searchView);
            state.selectedCategory = ALL;
            state.searchTerms = onSearch ? current.searchTerms : '';
            this.changeState(state);
        }
        const box = /** @type {HTMLInputElement} */ (document.getElementById('swrlSearch'));
        box.focus();
        box.select();
    }

    /**
     * A category's search, with the cursor in the box (the search button's
     * choices). Called from a tap, so the phone keyboard comes up.
     *
     * @param {string} name
     */
    openCategorySearch(name) {
        const category = Categories.find(c => c.name === name);
        if (!category) return;
        const current = this.currentState;
        if (!(current.view === this.searchView && current.selectedCategory === category)) {
            const state = new State(this.searchView);
            state.selectedCategory = category;
            this.changeState(state);
        }
        const box = /** @type {HTMLInputElement} */ (document.getElementById('swrlSearch'));
        box.focus();
        box.select();
    }

    /**
     * From the phone's bottom bar. On a category's list it keeps the tab
     * (Your list, Discover or Search) and the search words, so switching from
     * Watch to Read is like picking another category in the sidebar while
     * staying put; anywhere else it opens the list as a home tile does.
     *
     * @param {string} name
     */
    _switchCategory(name) {
        const category = Categories.find(c => c.name === name);
        if (!category) return;
        const current = this.currentState;
        if (current.view.screen !== this.listScreen) {
            this._openCategory(name);
            return;
        }
        if (current.selectedCategory === category) return;
        const state = new State(current.view);
        state.selectedCategory = category;
        state.searchTerms = current.searchTerms;
        this.changeState(state);
    }

    /**
     * A count on the filter icon while any filter is on (type, swrled to
     * me, labels, genres), so a short list never looks like a short list.
     */
    _updateFilterIndicator() {
        const state = this.currentState;
        const count = activeFilterCount(state);
        setFilterCount(count);
        applyListView();
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
            this.openFilters();
        });
        bindListToolbar(() => this.openFilters(), id => this.changeListView(id));
        initDesktopSidebar({
            home: () => { if (this.currentState.view !== this.homeView) this.changeState(new State(this.homeView)); },
            search: () => this.openSearchEverything(),
            category: name => this._openCategory(name),
            inbox: () => { if (this.currentState.view !== this.inboxView) this.changeState(new State(this.inboxView)); }
        });
        initPhoneNav({
            home: () => { if (this.currentState.view !== this.homeView) this.changeState(new State(this.homeView)); },
            category: name => this._switchCategory(name)
        });
        initQuickAdd(Categories, {
            all: () => this.openSearchEverything(),
            category: name => this.openCategorySearch(name)
        });
        // the quick ways in to adding something: the home screen's search box
        // and the header's search button (Tiles home on phones)
        ['homeSearch', 'headerSearch'].forEach(id => document.getElementById(id).addEventListener('click', (e) => {
            e.preventDefault();
            this.openSearchEverything();
        }));
        this._bindSheetAndTabs();
    }

    /**
     * Compact or detailed, from the switch under the tabs. The lists change at
     * once; the choice is saved on the profile behind the scenes.
     *
     * @param {string} id
     */
    changeListView(id) {
        const view = listViewFromId(id);
        if (view === getListView()) return;
        const saving = setListView(view, this.firestore);
        applyListView();
        saving.catch(error => {
            console.error('Could not save the list view');
            console.error(error);
            applyListView();
            showToasterMessage("Couldn't save how your lists look");
        });
    }

    /** Opens the filter and sort sheet for the list showing. */
    openFilters() {
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
        this._showInProgressFilter();

        const filters = document.getElementById('filters')
        filters.classList.remove('hidden');
    }

    /** The filter sheet's buttons, the tabs and the home screen's sections. */
    _bindSheetAndTabs() {

        const filterApplyButton = document.getElementById('submitFilters');
        filterApplyButton.addEventListener('click', this.applyFilters());
        const fade = document.getElementById('fade');
        fade.addEventListener('click', this.applyFilters());
        // Esc closes the filter sheet, as a click outside it does
        const closeOnEscape = this.applyFilters();
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('filters').classList.contains('hidden')) closeOnEscape(e);
        });
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
        this.bindSwrlerTab(/** @type {HTMLElement} */ (document.getElementById('swrlerInProgressTab')), this.swrlerInProgressView);

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
    /** "Watching" (or reading, ...) in the filter sheet: only on Your list, where my started swrls are. */
    _showInProgressFilter() {
        const input = /** @type {HTMLInputElement} */ (document.getElementById('inProgressFilter'));
        const label = document.querySelector('label[for="inProgressFilter"]');
        const show = this.currentState.view === this.yourListView;
        input.classList.toggle('hidden', !show);
        label.classList.toggle('hidden', !show);
        if (!show) input.checked = false;
        const category = this.currentState.selectedCategory;
        label.textContent = category ? progressWords(category.id).now : 'In progress';
    }

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
        // places to eat have cuisines; everything else has genres
        const word = categoryWords(category.id).genre;
        document.getElementById('genreFiltersTitle').textContent = word === 'cuisine' ? 'Cuisine' : 'Genres';
        document.getElementById('genreFiltersHint').textContent = `Shows anything with at least one of the ${word}s you pick.`;
        search.placeholder = `Find a ${word}`;
        search.setAttribute('aria-label', `Find a ${word}`);
        none.textContent = `No ${word} matches that.`;
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
                more.textContent = expanded ? 'Show fewer' : `Show all ${counts.length} ${word}s`;
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
            discoverState.filters = withoutYourListOnlyFilters(this.currentState.filters)
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
            searchState.filters = withoutYourListOnlyFilters(this.currentState.filters)
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
            state.filters = withoutYourListOnlyFilters(this.currentState.filters)
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