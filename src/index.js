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

// @ts-ignore
require("typeface-raleway");
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

/** @type {StateController} */
let stateController;

const app = {
    // Application Constructor
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        document.addEventListener('backbutton', () => {
            if (stateController !== undefined) {
                stateController.hidefilters();
                stateController.showPreviousScreen();
            }
        });
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: async function () {
        console.log('Received Event: onDeviceReady');
        try {
            bindMenuSwipeAction();
            const firebase = initialiseFirebase();
            const firestore = firebase.firestore();
            document.addEventListener('offline', () => firestore.disableNetwork(), false);
            document.addEventListener('online', () => firestore.enableNetwork(), false);

            // @ts-ignore
            const initialState = navigator.connection.type;
            // @ts-ignore
            if (initialState === Connection.NONE) {
                firestore.disableNetwork();
            } else {
                firestore.enableNetwork();
            }
            setUpLogin(firebase, firestore);
            initMessaging(firebase, firestore);
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
            window.history.replaceState({ stateId: startState.id }, 'Swrl List 2', '/')

            //@ts-ignore
            if (device.platform === 'browser') {
                while (!initialisedLogin) {
                    console.log('waiting for login...')
                    await new Promise((resolve, _) => setTimeout(() => resolve(), 300))
                }
                console.log('testing for deep link')
                const match = /\/([^\/]*)\/?([^\/]*)\/?/.exec(originalPath);
                if (match && match.length > 1) {
                    switch (match[1]) {
                        case 'swrl':
                            swrlRoute(match, firestore);
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
            } else {
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
        window.location.reload(true);
    } else {
        alert(what + '; ' + line + '; ' + file);
    }
};

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
 * @param {firebase.firestore.Firestore} firestore
 */
function swrlRoute(match, firestore) {
    const swrlId = match[2];
    if (swrlId) {
        console.log(`Found deep link for swrl, id: ${swrlId}`);
        document.getElementById('loadingView').classList.remove('hidden');
        firestore.collection(Collection.SWRLS).doc(swrlId).get()
            .then(doc => {
                if (doc.exists) {
                    const swrl = Swrl.fromFirestore(doc.data());
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
    }
}

/**
 * @param {any[]} match
 * @param {firebase.firestore.Firestore} firestore
 */
function recommendRoute(match, firestore) {
    const swrlId = match[2];
    if (swrlId) {
        console.log(`Found deep link for swrl, id: ${swrlId}`);
        document.getElementById('loadingView').classList.remove('hidden');
        firestore.collection(Collection.SWRLS).doc(swrlId).get()
            .then(doc => {
                if (doc.exists) {
                    const swrl = Swrl.fromFirestore(doc.data());
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