export default { swrlUser, setUpLogin };

export var swrlUser;

import { Collection } from '../constants/Collection';
import { setUpRecommendationsListener, cancelRecommendationsListener } from '../listeners/recommendations';

var firebase;
const loggingInView = document.getElementById('loggingInView');
const loggingInAnonymousView = document.getElementById('loggingInAnonymousView');

export function setUpLogin(firebaseInstance, firestore) {
    firebase = firebaseInstance;
    document.querySelector("#logout").addEventListener("click", logout);
    document.querySelector("#logout").addEventListener("touchstart", logout);
    document.querySelector("#login").addEventListener("click", () => login(firestore));
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            swrlUser = user;
            console.log("user logged in: " + swrlUser.displayName);

            if (swrlUser.isAnonymous) {
                handleAnonymous();
            } else {
                handleLoginSuccess(firestore);
            }
        } else {
            swrlUser = undefined;
            console.log("user not logged in");
            loginAnonymously();
            handleLogout();
        }
    });
}

function loginAnonymously() {
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.remove('hidden');

    firebase.auth().signInAnonymously()
        .then(() => {
            loggingInView.classList.add('hidden');
            loggingInAnonymousView.classList.add('hidden');
        })
        .catch(function (error) {
            console.error("anonymous log in failed: " + JSON.stringify(error));
            loggingInView.classList.add('hidden');
            loggingInAnonymousView.classList.add('hidden');
            handleLogout();
        });
}

function logout() {
    firebase.auth().signOut();
    document.querySelector("#openSidebarMenu").checked = false;
    handleLogout();
}

function login(firestore) {
    var provider = new firebase.auth.GoogleAuthProvider();

    loggingInView.classList.remove('hidden');
    loggingInAnonymousView.classList.add('hidden');

    firebase.auth().getRedirectResult().then(function (result) {
        swrlUser = result.user;
        console.log("firebase user from get redirect result: " + swrlUser.displayName);
        handleLoginSuccess(firestore);
    }).catch(function (error) {
        console.error("got redirect error");
        console.error(error);
        firebase.auth().signInWithRedirect(provider).then(function () {
            return firebase.auth().getRedirectResult();
        }).then(function (result) {
            swrlUser = result.user;
            console.log("firebase user: " + swrlUser.displayName);
            handleLoginSuccess(firestore);
        }).catch(function (error) {
            console.error("Login failed");
            console.error(error);
            if (!swrlUser) {
                loginAnonymously();
            }
        });
    })
}

/**
* @param {firebase.firestore.Firestore} firestore 
*/
function handleLoginSuccess(firestore) {
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.add('hidden');

    updateSwrlerDetails(firestore);
    setUpRecommendationsListener(firestore);
    document.querySelector("#userPhoto").src = swrlUser.photoURL;
    document.querySelector("#userPhoto").classList.remove('hidden');
    document.querySelector("#inboxDisplay").classList.remove('hidden');
    document.querySelector("#logout").classList.remove('hidden');
    document.querySelector("#login").classList.add('hidden');
    document.querySelector("#loginStatus").innerHTML = swrlUser.displayName;
}

/**
 * @param {firebase.firestore.Firestore} firestore
 */
function updateSwrlerDetails(firestore) {
    var swrler = {
        uid: swrlUser.uid,
        displayName: swrlUser.displayName,
        email: swrlUser.email,
        photoURL: swrlUser.photoURL,
        lastLoginTime: firebase.firestore.FieldValue.serverTimestamp()
    }
    firestore.collection(Collection.SWRLERS).doc(swrlUser.uid).set(swrler, { merge: true });
}

function handleAnonymous() {
    document.querySelector("#inboxDisplay").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#userPhoto").classList.add('hidden');
    document.querySelector("#loginStatus").innerHTML = "Mystery Swrler";
    cancelRecommendationsListener();
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.add('hidden');
}

function handleLogout() {
    document.querySelector("#inboxDisplay").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#userPhoto").classList.add('hidden');
    document.querySelector("#loginStatus").innerHTML = "Not Logged In";
    cancelRecommendationsListener();
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.add('hidden');
}