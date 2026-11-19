import { disableNetwork, doc, enableNetwork, getDoc } from 'firebase/firestore';
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import "@fontsource/raleway/400.css";
import "@fontsource/raleway/700.css";
import "@fontsource/raleway/800.css";
import bindMenuSwipeAction from './utils/swipeUtils';
import initialiseFirebase from './firebase/init';
import { setUpLogin, initialisedLogin, swrlUser } from './firebase/login';
import { StateController } from './views/stateController';
import { State } from './model/state';
import { initMessaging } from './firebase/messaging';
import { Collection } from './constants/Collection';
import { Swrl } from './model/swrl';
import { Category, WATCH, LISTEN, READ, PLAY, ALL } from './constants/Category';
import { parseShare } from './model/share';
import { swrlFromLink } from './search/sharedLink';
import { showToasterMessage } from './components/toaster';
import { inboxReady } from './listeners/recommendations';
import { getSwrler } from './firebase/swrler';
import { initSearchClearButtons } from './components/searchClear';
import { setUpKeyboardAccess } from './components/keyboard';
import { startUpdateCheck } from './components/updateCheck';

/** @type {StateController} */
let stateController;

const app = {
    initialize: function () {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    },

    start: async function () {
        try {
            bindMenuSwipeAction();
            const { app: firebaseApp, firestore } = initialiseFirebase();
            window.addEventListener('offline', () => disableNetwork(firestore));
            window.addEventListener('online', () => enableNetwork(firestore));
            if (!navigator.onLine) {
                disableNetwork(firestore);
            }
            setUpLogin(firebaseApp, firestore);
            initMessaging(firebaseApp, firestore);
            stateController = new StateController(firestore);
            stateController.initialiseAllViews();
            initSearchClearButtons();
            setUpKeyboardAccess();
            startUpdateCheck();
            document.getElementById('appVersion').textContent = APP_VERSION;

            window.onpopstate =
                /**
                 * @param {PopStateEvent} event
                 */
                (event) => {
                    if (event.state) {
                        const state = stateController.previousStates.find(s => s.id === event.state.stateId)
                        if (state) {
                            stateController.replaceState(state);
                        } else {
                            stateController.changeState(startState);
                        }
                    } else {
                        stateController.changeState(startState);
                    }
                }

            const originalPath = document.location.pathname;
            const originalParams = new URLSearchParams(document.location.search);
            const startState = new State(stateController.homeView);
            stateController.previousStates.push(startState);
            stateController.currentState = startState;

            registerServiceWorker();
            window.history.replaceState({ stateId: startState.id }, 'Swrl List', '/')
            while (!initialisedLogin) {
                console.log('waiting for login...')
                await new Promise(resolve => setTimeout(resolve, 300))
            }
            console.log('testing for deep link')
            const match = /\/([^\/]*)\/?([^\/]*)\/?/.exec(originalPath);
            if (match && match.length > 1) {
                switch (match[1]) {
                    case 'swrl':
                        swrlRoute(match, firestore, startState, originalParams.get('from'));
                        break;
                    case 'swrler':
                        swrlerRoute(match, firestore, startState);
                        break;
                    case 'watch':
                        listRoute(WATCH);
                        break;
                    case 'read':
                        listRoute(READ);
                        break;
                    case 'listen':
                        listRoute(LISTEN);
                        break;
                    case 'play':
                        listRoute(PLAY);
                        break;
                    case 'recommend':
                        recommendRoute(match, firestore);
                        break;
                    case 'recommendations':
                        recommendationsRoute()
                        break;
                    case 'savedsearches':
                        savedSearchesRoute();
                        break;
                    case 'search':
                        searchEverythingRoute(originalParams.get('q') || '');
                        break;
                    case 'share':
                        shareRoute(originalParams, firestore);
                        break;
                    case 'friends':
                        friendsRoute(startState);
                        break;
                    case 'about':
                        document.getElementById('loadingView').classList.add('hidden');
                        stateController.changeState(new State(stateController.aboutView));
                        break;
                    case 'settings':
                        settingsRoute(startState);
                        break;
                    default:
                        console.log('Not a recognised deep link URL')
                        stateController.changeState(startState);
                        break;
                }
            } else {
                console.log('Not a deep link URL')
                stateController.changeState(startState);
            }
        } catch (error) {
            console.error('Caught Error loading');
            console.error(error);
        }
    }
};

window.onerror = function (what, line, file) {
    if (what.toString().match('FIRESTORE|The transaction was aborted')) {
        window.location.reload();
    } else {
        alert(what + '; ' + line + '; ' + file);
    }
};

/**
 * Registers the app-shell service worker that makes the web app installable
 * and usable offline.
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator
        && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(() => console.log('Service worker registered'))
            .catch(err => {
                console.error('Service worker registration failed');
                console.error(err);
            });
    }
}

/**
 * @param {Category} category
 */
function listRoute(category) {
    const state = new State(stateController.yourListView);
    state.selectedCategory = category;
    document.getElementById('loadingView').classList.add('hidden');
    stateController.changeState(state);
}

/**
 * The "search everything" page, optionally with a search already typed.
 *
 * @param {string} searchText
 */
function searchEverythingRoute(searchText) {
    const state = new State(stateController.searchView);
    state.selectedCategory = ALL;
    state.searchTerms = searchText;
    document.getElementById('loadingView').classList.add('hidden');
    stateController.changeState(state);
}

/**
 * Something shared to the app from another app (the manifest's share_target).
 * A link we recognise (an IMDb or TMDB film or TV page) opens that swrl's
 * page, ready to add or recommend. Anything else becomes a search of every
 * source for the shared words.
 *
 * @param {URLSearchParams} params title, text and url, as the sharing app gave them
 * @param {import('firebase/firestore').Firestore} firestore
 */
async function shareRoute(params, firestore) {
    const { link, query } = parseShare({ title: params.get('title'), text: params.get('text'), url: params.get('url') });
    if (link) {
        document.getElementById('loadingView').classList.remove('hidden');
        try {
            const shared = await swrlFromLink(link);
            if (shared) {
                // The stored doc, when someone already has it, carries the counts.
                const docSnapshot = await getDoc(doc(firestore, Collection.SWRLS, shared.swrlID)).catch(() => undefined);
                const swrl = docSnapshot && docSnapshot.exists() ? Swrl.fromFirestore(docSnapshot.data()) : shared;
                const state = new State(stateController.swrlView);
                state.swrl = swrl;
                state.selectedCategory = swrl.category;
                document.getElementById('loadingView').classList.add('hidden');
                stateController.changeState(state);
                return;
            }
        } catch (error) {
            console.error('Could not open the shared link');
            console.error(error);
        }
        showToasterMessage(query ? "Couldn't open that link, searching instead" : "Couldn't open that link");
    } else if (!query) {
        showToasterMessage("Couldn't find anything to search for in what was shared");
    }
    searchEverythingRoute(query);
}

function recommendationsRoute() {
    const state = new State(stateController.inboxView);
    document.getElementById('loadingView').classList.add('hidden');
    stateController.changeState(state);
}

function savedSearchesRoute() {
    const state = new State(stateController.savedSearchesView);
    document.getElementById('loadingView').classList.add('hidden');
    stateController.changeState(state);
}

/**
 * Friends needs a real account; anyone else lands on the home page.
 *
 * @param {State} startState
 */
function friendsRoute(startState) {
    document.getElementById('loadingView').classList.add('hidden');
    if (swrlUser && !swrlUser.isAnonymous) {
        stateController.changeState(new State(stateController.friendsView));
    } else {
        stateController.changeState(startState);
    }
}

/**
 * Settings needs a real account; anyone else lands on the home page.
 *
 * @param {State} startState
 */
function settingsRoute(startState) {
    document.getElementById('loadingView').classList.add('hidden');
    if (swrlUser && !swrlUser.isAnonymous) {
        stateController.changeState(new State(stateController.settingsView));
    } else {
        stateController.changeState(startState);
    }
}

/**
 * @param {any[]} match
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {State} startState
 * @param {string | null} [shareID] the ?from= of a link someone shared
 */
function swrlRoute(match, firestore, startState, shareID) {
    const swrlId = match[2] ? decodeURIComponent(match[2]) : match[2];
    if (swrlId) {
        console.log(`Found deep link for swrl, id: ${swrlId}`);
        document.getElementById('loadingView').classList.remove('hidden');
        // A link someone shared names its share: who sent it and what they said.
        const share = shareID
            ? getDoc(doc(firestore, Collection.SHARES, shareID)).catch(() => undefined)
            : Promise.resolve(undefined);
        Promise.all([getDoc(doc(firestore, Collection.SWRLS, swrlId)), share])
            .then(([docSnapshot, shareSnapshot]) => {
                if (docSnapshot.exists()) {
                    const swrl = Swrl.fromFirestore(docSnapshot.data());
                    const category = swrl.category;
                    const swrlFullPage = new State(stateController.swrlView);
                    swrlFullPage.swrl = swrl;
                    const shared = shareSnapshot && shareSnapshot.exists() ? shareSnapshot.data() : undefined;
                    if (shared && shared.swrlID === swrlId && shared.fromName) {
                        swrlFullPage.share = { fromName: shared.fromName, message: shared.message || '' };
                    }
                    swrlFullPage.selectedCategory = category;
                    document.getElementById('loadingView').classList.add('hidden');
                    stateController.changeState(swrlFullPage);
                }
                else {
                    console.log('Swrl did not exist, going to home page');
                    document.getElementById('loadingView').classList.add('hidden');
                    const startState = new State(stateController.homeView);
                    stateController.changeState(startState);
                    window.history.replaceState({ stateId: startState.id }, 'Swrl List', '/');

                }
            })
            .catch(err => {
                console.error(err);
                document.getElementById('loadingView').classList.add('hidden');
            });
    } else {
        stateController.changeState(startState);
    }
}

/**
 * @param {any[]} match
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {State} startState
 */
function swrlerRoute(match, firestore, startState) {
    const swrlerId = match[2];
    if (swrlerId) {
        console.log(`Found deep link for swrler, id: ${swrlerId}`);
        document.getElementById('loadingView').classList.remove('hidden');
        getSwrler(swrlerId, firestore)
            .then(swrler => {
                if (swrler) {
                    const state = new State(stateController.swrlerLaterView);
                    state.swrler = swrler;
                    document.getElementById('loadingView').classList.add('hidden');
                    stateController.changeState(state);
                }
                else {
                    console.log('Swrler did not exist, going to home page');
                    document.getElementById('loadingView').classList.add('hidden');
                    const startState = new State(stateController.homeView);
                    stateController.changeState(startState);
                    window.history.replaceState({ stateId: startState.id }, 'Swrl List', '/');

                }
            })
            .catch(err => {
                console.error(err);
                document.getElementById('loadingView').classList.add('hidden');
            });
    } else {
        stateController.changeState(startState);
    }
}

/**
 * @param {any[]} match
 * @param {import('firebase/firestore').Firestore} firestore
 */
function recommendRoute(match, firestore) {
    const swrlId = match[2];
    if (swrlId) {
        console.log(`Found deep link for swrl, id: ${swrlId}`);
        document.getElementById('loadingView').classList.remove('hidden');
        getDoc(doc(firestore, Collection.SWRLS, swrlId))
            .then(docSnapshot => {
                if (docSnapshot.exists()) {
                    const swrl = Swrl.fromFirestore(docSnapshot.data());
                    const state = new State(stateController.recommendView);
                    state.swrl = swrl;
                    document.getElementById('loadingView').classList.add('hidden');
                    stateController.changeState(state);
                }
                else {
                    console.log('Swrl did not exist, going to home page');
                    document.getElementById('loadingView').classList.add('hidden');
                    const startState = new State(stateController.homeView);
                    stateController.changeState(startState);
                    window.history.replaceState({ stateId: startState.id }, 'Swrl List', '/');
                }
            })
            .catch(err => {
                console.error(err);
                document.getElementById('loadingView').classList.add('hidden');
            });
    }
}


app.initialize();