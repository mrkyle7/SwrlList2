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
var app = {
    // Application Constructor
    initialize: function () {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function () {
        this.receivedEvent('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvent: function (id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        listeningElement.setAttribute('style', 'display:none;');
        console.log('Received Event: ' + id);
        trySilentLogin();
    }
};
function isAvailable() {
    window.plugins.googleplus.isAvailable(function (avail) { alert(avail) });
}

function login() {
    console.log("Logging in");
    window.plugins.googleplus.login(
        {},
        function (obj) {
            document.querySelector("#image").src = obj.imageUrl;
            document.querySelector("#image").classList.remove('hidden');

            document.querySelector("#logout").classList.remove('hidden');

            document.querySelector("#login").classList.add('hidden');

            document.querySelector("#feedback").innerHTML = "Hi, " + obj.displayName;
        },
        function (msg) {
            document.querySelector("#feedback").innerHTML = "error: " + msg;
        }
    );
}

function trySilentLogin() {
    window.plugins.googleplus.trySilentLogin(
        {},
        function (obj) {
            document.querySelector("#image").src = obj.imageUrl;
            document.querySelector("#image").classList.remove('hidden');

            document.querySelector("#logout").classList.remove('hidden');

            document.querySelector("#feedback").innerHTML = "Hi, " + obj.displayName;
        },
        function (msg) {
            document.querySelector("#login").classList.remove('hidden');
        }
    );
}

function logout() {
    window.plugins.googleplus.logout(
        function (msg) {
            document.querySelector("#image").classList.add('hidden');

            document.querySelector("#logout").classList.add('hidden');

            document.querySelector("#login").classList.remove('hidden');

            document.querySelector("#feedback").innerHTML = "Logged out";
        },
        function (msg) {
            document.querySelector("#feedback").innerHTML = msg;
        }
    );
}

function disconnect() {
    window.plugins.googleplus.disconnect(
        function (msg) {
            document.querySelector("#image").style.visibility = 'hidden';
            document.querySelector("#feedback").innerHTML = msg;
        },
        function (msg) {
            document.querySelector("#feedback").innerHTML = msg;
        }
    );
}

window.onerror = function (what, line, file) {
    alert(what + '; ' + line + '; ' + file);
};

function handleOpenURL(url) {
    document.querySelector("#feedback").innerHTML = "App was opened by URL: " + url;
}

app.initialize();