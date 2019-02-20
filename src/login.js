var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");
require("firebase/messaging");

var swrlUser;

export default function setUpLogin() {
    document.querySelector("#logout").addEventListener("click", logout);
    document.querySelector("#logout").addEventListener("touchstart", logout);
    document.querySelector("#login").addEventListener("click", login);
    var config = {
        apiKey: "AIzaSyAWAhzSXf6M_dhxNS4SI830qWNy-zF51wk",
        authDomain: "swrl-1118.firebaseapp.com",
        databaseURL: "https://swrl-1118.firebaseio.com",
        projectId: "swrl-1118",
        storageBucket: "swrl-1118.appspot.com",
        messagingSenderId: "443237991407"
    };
    firebase.initializeApp(config);
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            swrlUser = user;
            console.log("user logged in: " + JSON.stringify(swrlUser));

            var isAnonymous = swrlUser.isAnonymous;
            if (isAnonymous) {
                handleAnonymous();
            } else {
                handleLoginSuccess()
            }
        } else {
            console.log("user not logged in");
            firebase.auth().signInAnonymously().catch(function (error) {
                console.error(error);
            })
            handleLogout();
        }
    });
}

function logout() {
    firebase.auth().signOut();
    document.querySelector("#openSidebarMenu").checked = false;
}

function login() {
    var provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().getRedirectResult().then(function(result) {
        // This gives you a Google Access Token.
        // You can use it to access the Google API.
        var token = result.credential.accessToken;
        // The signed-in user info.
        swrlUser = result.user;
        console.log("firebase user from get redirect result: " + JSON.stringify(swrlUser));
        handleLoginSuccess();
    }).catch(function(error) {
        console.error("got redirect error: " + error);
        firebase.auth().signInWithRedirect(provider).then(function () {
            return firebase.auth().getRedirectResult();
        }).then(function (result) {
            // This gives you a Google Access Token.
            // You can use it to access the Google API.
            var token = result.credential.accessToken;
            // The signed-in user info.
            swrlUser = result.user;
            console.log("firebase user: " + JSON.stringify(swrlUser));
            handleLoginSuccess();
            // ...
        }).catch(function (error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.error("Login failed: " + JSON.stringify(error))
        });
    })
}

function handleLoginSuccess() {
    document.querySelector("#image").src = swrlUser.photoURL;
    document.querySelector("#image").classList.remove('hidden');
    document.querySelector("#logout").classList.remove('hidden');
    document.querySelector("#login").classList.add('hidden');
    document.querySelector("#feedback").innerHTML = "Hi, " + swrlUser.displayName;
}

function handleAnonymous() {
    document.querySelector("#image").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#feedback").innerHTML = "Hi, You are logged in anonymously";
}

function handleLogout() {
    document.querySelector("#image").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#feedback").innerHTML = "Hi, You are logged out";
}