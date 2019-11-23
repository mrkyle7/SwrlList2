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
import { setUpLogin } from './firebase/login';
import { StateController } from './views/stateController';
import { State } from './model/state';
import { initMessaging } from './firebase/messaging';

/** @type {StateController} */
let stateController;

const app = {
    // Application Constructor
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        document.addEventListener('backbutton', () => {
            if (stateController !== undefined) {
                stateController.showPreviousScreen();
            }
        });
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function () {
        console.log('Received Event: onDeviceReady');
        try {
            bindMenuSwipeAction();
            const firebase = initialiseFirebase();
            const firestore = firebase.firestore();
            setUpLogin(firebase, firestore);
            initMessaging(firebase, firestore);
            stateController = new StateController(firestore);
            stateController.initialiseAllViews();
            const startState = new State(stateController.homeView, undefined, undefined, undefined);
            stateController.changeState(startState);
        } catch (error) {
            console.error('Caught Error loading');
            console.error(error);
        }
    }
};

window.onerror = function (what, line, file) {
    alert(what + '; ' + line + '; ' + file);
};

function handleOpenURL(url) {
    document.querySelector("#feedback").innerHTML = "App was opened by URL: " + url;
}

app.initialize();