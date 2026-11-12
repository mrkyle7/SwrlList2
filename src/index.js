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
import { Category, WATCH, LISTEN, READ, PLAY } from './constants/Category';
import { inboxReady } from './listeners/recommendations';
import { getSwrler } from './firebase/swrler';

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
            const startState = new State(stateController.homeView);
            stateController.previousStates.push(startState);
            stateController.currentState = startState;

            registerServiceWorker();
            window.history.replaceState({ stateId: startState.id }, 'Swrl List 2', '/')
            while (!initialisedLogin) {
                console.log('waiting for login...')
                await new Promise(resolve => setTimeout(resolve, 300))
            }
            console.log('testing for deep link')
            const match = /\/([^\/]*)\/?([^\/]*)\/?/.exec(originalPath);
            if (match && match.length > 1) {
                switch (match[1]) {
                    case 'swrl':
                        swrlRoute(match, firestore, startState);
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
 * @param {any[]} match
 * @param {import('firebase/firestore').Firestore} firestore
 * @param {State} startState
 */
function swrlRoute(match, firestore, startState) {
    const swrlId = match[2];
    if (swrlId) {
        console.log(`Found deep link for swrl, id: ${swrlId}`);
        document.getElementById('loadingView').classList.remove('hidden');
        getDoc(doc(firestore, Collection.SWRLS, swrlId))
            .then(docSnapshot => {
                if (docSnapshot.exists()) {
                    const swrl = Swrl.fromFirestore(docSnapshot.data());
                    const category = swrl.category;
                    const swrlFullPage = new State(stateController.swrlView);
                    swrlFullPage.swrl = swrl;
                    swrlFullPage.selectedCategory = category;
                    document.getElementById('loadingView').classList.add('hidden');
                    stateController.changeState(swrlFullPage);
                }
                else {
                    console.log('Swrl did not exist, going to home page');
                    document.getElementById('loadingView').classList.add('hidden');
                    const startState = new State(stateController.homeView);
                    stateController.changeState(startState);
                    window.history.replaceState({ stateId: startState.id }, 'Swrl List 2', '/');

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
                    window.history.replaceState({ stateId: startState.id }, 'Swrl List 2', '/');

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
                    window.history.replaceState({ stateId: startState.id }, 'Swrl List 2', '/');
                }
            })
            .catch(err => {
                console.error(err);
                document.getElementById('loadingView').classList.add('hidden');
            });
    }
}


app.initialize();