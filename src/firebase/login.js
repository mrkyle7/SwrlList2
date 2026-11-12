/** @type {firebase.User} */
export let swrlUser;
export default { swrlUser, setUpLogin };

import { Collection } from '../constants/Collection';
import { setUpRecommendationsListener, cancelRecommendationsListener } from '../listeners/recommendations';
import swrl from '../components/swrl';
import { updateDeviceToken } from './messaging';
import firebase from 'firebase/compat/app';
/** @type {firebase.app.App} */
let myFirebase;
const loggingInView = document.getElementById('loggingInView');
const loggingInAnonymousView = document.getElementById('loggingInAnonymousView');

export let initialisedLogin = false;

/**
 * @param {firebase.app.App} firebaseInstance
 * @param {firebase.firestore.Firestore} firestore
 */
export function setUpLogin(firebaseInstance, firestore) {
    myFirebase = firebaseInstance;
    document.querySelector("#logout").addEventListener("click", logout);
    document.querySelector("#logout").addEventListener("touchstart", logout);
    document.querySelector("#login").addEventListener("click", () => login(firestore));
    myFirebase.auth().onAuthStateChanged((user) => {
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
        initialisedLogin = true;
    }, (error) => {
        console.error('Error on auth state changed');
        console.error(error);
        initialisedLogin = true;
    });
}

function loginAnonymously() {
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.remove('hidden');

    try {
        myFirebase.auth().signInAnonymously()
            .then(() => {
                loggingInView.classList.add('hidden');
                loggingInAnonymousView.classList.add('hidden');
            })
            .catch(/**
             * @param {Error} error
             */
                (error) => {
                    console.error("anonymous log in failed: " + JSON.stringify(error));
                    loggingInView.classList.add('hidden');
                    loggingInAnonymousView.classList.add('hidden');
                    handleLogout();
                });
    } catch (error) {
        console.error("anonymous log in failed: " + JSON.stringify(error));
        loggingInView.classList.add('hidden');
        loggingInAnonymousView.classList.add('hidden');
        handleLogout();
    }
}

function logout() {
    myFirebase.auth().signOut();
    /** @type {HTMLInputElement} */
    const openSidebarMenuElement = document.querySelector("#openSidebarMenu");
    openSidebarMenuElement.checked = false;
    handleLogout();
}

/** @param {firebase.firestore.Firestore} firestore */
function login(firestore) {
    const provider = new firebase.auth.GoogleAuthProvider();

    loggingInView.classList.remove('hidden');
    loggingInAnonymousView.classList.add('hidden');

    // Popup, not redirect: signInWithRedirect relies on an iframe on the
    // Firebase auth domain reading storage from inside our page, and browsers
    // now partition that storage per site, so the redirect comes back with no
    // user on any domain other than *.firebaseapp.com.
    myFirebase.auth().signInWithPopup(provider)
        .then(function (result) {
            swrlUser = result.user;
            console.log("firebase user from popup: " + swrlUser.displayName);
            handleLoginSuccess(firestore);
        })
        .catch(function (error) {
            console.error("Login failed");
            console.error(error);
            if (!swrlUser) {
                loginAnonymously();
            } else if (swrlUser.isAnonymous) {
                handleAnonymous();
            }
        });
}

/**
* @param {firebase.firestore.Firestore} firestore 
*/
function handleLoginSuccess(firestore) {
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.add('hidden');

    updateSwrlerDetails(firestore);
    setUpRecommendationsListener(firestore);
    showLoginButtons();
    updateDeviceToken(firestore);
    /** @type {HTMLImageElement} */
    const userPhotoElement = document.querySelector("#userPhoto");
    userPhotoElement.src = swrlUser.photoURL;
    userPhotoElement.addEventListener('error',
    /**
     * @param {Event} e
     */
    (e) => {
        /** @type {HTMLImageElement} */
        // @ts-ignore
        const image = e.target;
        if (image) {
            image.src = 'img/emoji_people-24px.svg' 
        }
    });
    document.getElementById("userPhoto").classList.remove('hidden');
    document.getElementById("logout").classList.remove('hidden');
    document.getElementById("savedSearchesMenu").classList.remove('hidden');
    document.getElementById("login").classList.add('hidden');
    document.getElementById("loginStatus").innerHTML = swrlUser.displayName;
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
    document.querySelector("#savedSearchesMenu").classList.add('hidden');
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
    document.querySelector("#savedSearchesMenu").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#userPhoto").classList.add('hidden');
    document.querySelector("#loginStatus").innerHTML = "Not Logged In";
    cancelRecommendationsListener();
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.add('hidden');
}

export const hideLoginButtons = () => {
    document.querySelector("#inboxDisplay").classList.add('hidden');
    document.querySelector("#login").classList.add('hidden');
}

export const showLoginButtons = () => {
    if (!swrlUser || swrlUser.isAnonymous) {
        document.querySelector("#login").classList.remove('hidden');
    } else {
        document.querySelector("#inboxDisplay").classList.remove('hidden');
    }
}