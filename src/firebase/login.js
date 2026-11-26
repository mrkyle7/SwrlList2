/** @type {import('firebase/auth').User} */
export let swrlUser;
export default { swrlUser, setUpLogin };

import {
    browserPopupRedirectResolver, getAuth, GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut
} from 'firebase/auth';
import { deleteField, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Collection } from '../constants/Collection';
import { setUpRecommendationsListener, cancelRecommendationsListener } from '../listeners/recommendations';
import { setUpListEntriesListener, cancelListEntriesListener, primeListEntries } from '../listeners/listEntries';
import { clearBootCache, loadBootCache } from './bootCache';
import { setUpFriendsListener, cancelFriendsListener } from '../listeners/friends';
import { setUpLabelsListener, cancelLabelsListener } from '../listeners/labels';
import swrl from '../components/swrl';
import { updateDeviceToken } from './messaging';
/** @type {import('firebase/auth').Auth} */
let auth;
const loggingInView = document.getElementById('loggingInView');
const loggingInAnonymousView = document.getElementById('loggingInAnonymousView');

/** @type {() => void} */
let resolveLoginReady;
/**
 * Resolves once we know who is using the app: someone signed in, an
 * anonymous visitor, or that signing in failed (offline on a first visit).
 * Start-up waits for it before opening the first screen. For someone already
 * signed in it is quick: the sign-in is read from the device.
 *
 * @type {Promise<void>}
 */
export const loginReady = new Promise(resolve => { resolveLoginReady = resolve; });

/**
 * @param {import('firebase/app').FirebaseApp} firebaseApp
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function setUpLogin(firebaseApp, firestore) {
    auth = getAuth(firebaseApp);
    loginFirestore = firestore;
    document.querySelector("#logout").addEventListener("click", logout);
    document.querySelector("#logout").addEventListener("touchstart", logout);
    document.querySelector("#login").addEventListener("click", () => login(firestore));
    // Open at once as whoever was signed in last time, from the copy saved on
    // this device (firebase/bootCache.js): Firebase Auth checks the saved
    // sign-in with the server before answering, a round trip or more on a
    // slow connection. Its answer below then confirms it (and starts the live
    // listeners), switches to someone else, or signs out.
    let authAnswered = false;
    loadBootCache().then(boot => {
        if (!boot || authAnswered) return;
        // @ts-ignore just what start-up reads; replaced by the real user moments later
        swrlUser = { uid: boot.user.uid, displayName: boot.user.displayName, photoURL: boot.user.photoURL, isAnonymous: false, providerData: [] };
        primeListEntries(boot);
        showSignedIn();
        resolveLoginReady();
    });
    onAuthStateChanged(auth, (user) => {
        authAnswered = true;
        if (!user || user.isAnonymous || (swrlUser && swrlUser.uid !== user.uid)) {
            // nobody, or someone else: the saved copy is not theirs
            clearBootCache();
        }
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
    }, (error) => {
        console.error('Error on auth state changed');
        console.error(error);
        resolveLoginReady();
    });
}

function loginAnonymously() {
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.remove('hidden');

    try {
        signInAnonymously(auth)
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
                    resolveLoginReady();
                });
    } catch (error) {
        console.error("anonymous log in failed: " + JSON.stringify(error));
        loggingInView.classList.add('hidden');
        loggingInAnonymousView.classList.add('hidden');
        handleLogout();
        resolveLoginReady();
    }
}

function logout() {
    signOut(auth);
    /** @type {HTMLInputElement} */
    const openSidebarMenuElement = document.querySelector("#openSidebarMenu");
    openSidebarMenuElement.checked = false;
    handleLogout();
}

/** @type {import('firebase/firestore').Firestore} */
let loginFirestore;

/**
 * Starts the Google log-in, as the menu's Log in button does. Call it from a
 * tap: it opens a popup.
 */
export function loginWithGoogle() {
    login(loginFirestore);
}

/** @param {import('firebase/firestore').Firestore} firestore */
function login(firestore) {
    const provider = new GoogleAuthProvider();

    loggingInView.classList.remove('hidden');
    loggingInAnonymousView.classList.add('hidden');

    // Popup, not redirect: signInWithRedirect relies on an iframe on the
    // Firebase auth domain reading storage from inside our page, and browsers
    // now partition that storage per site, so the redirect comes back with no
    // user on any domain other than *.firebaseapp.com.
    signInWithPopup(auth, provider, browserPopupRedirectResolver)
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
* @param {import('firebase/firestore').Firestore} firestore 
*/
function handleLoginSuccess(firestore) {
    resolveLoginReady();
    updateSwrlerDetails(firestore);
    setUpRecommendationsListener(firestore);
    setUpListEntriesListener(firestore);
    setUpFriendsListener(firestore);
    setUpLabelsListener(firestore);
    updateDeviceToken(firestore);
    showSignedIn();
}

/** The menu and header as for someone signed in: their photo and name, Log out, Friends, Settings... */
function showSignedIn() {
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.add('hidden');
    showLoginButtons();
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
    document.getElementById("friendsMenu").classList.remove('hidden');
    document.getElementById("settingsMenu").classList.remove('hidden');
    document.getElementById("login").classList.add('hidden');
    document.getElementById("loginStatus").textContent = swrlUser.displayName;
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 */
function updateSwrlerDetails(firestore) {
    var swrler = {
        uid: swrlUser.uid,
        displayName: swrlUser.displayName,
        // Profiles are readable by every user, so never store the email here.
        // Also scrubs any email written by older versions of the app.
        email: deleteField(),
        photoURL: swrlUser.photoURL,
        lastLoginTime: serverTimestamp()
    }
    setDoc(doc(firestore, Collection.SWRLERS, swrlUser.uid), swrler, { merge: true });
}

function handleAnonymous() {
    resolveLoginReady();
    document.querySelector("#inboxDisplay").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#savedSearchesMenu").classList.add('hidden');
    document.querySelector("#friendsMenu").classList.add('hidden');
    document.querySelector("#settingsMenu").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#userPhoto").classList.add('hidden');
    document.querySelector("#loginStatus").innerHTML = "Mystery Swrler";
    cancelRecommendationsListener();
    cancelListEntriesListener();
    cancelFriendsListener();
    cancelLabelsListener();
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.add('hidden');
}

/**
 * Stops my Firestore listeners (and forgets their caches) without signing out.
 * Used while my account is being deleted, when they would only fail.
 */
export function pauseUserListeners() {
    cancelRecommendationsListener();
    cancelListEntriesListener();
    cancelFriendsListener();
    cancelLabelsListener();
}

/**
 * Starts my Firestore listeners again after pauseUserListeners, when the
 * account turned out not to be deleted.
 *
 * @param {import('firebase/firestore').Firestore} firestore
 */
export function resumeUserListeners(firestore) {
    if (!swrlUser || swrlUser.isAnonymous) return;
    setUpRecommendationsListener(firestore);
    setUpListEntriesListener(firestore);
    setUpFriendsListener(firestore);
    setUpLabelsListener(firestore);
}

/** Puts the page into its signed-out state and stops my listeners. */
export function handleLogout() {
    clearBootCache();
    document.querySelector("#inboxDisplay").classList.add('hidden');
    document.querySelector("#logout").classList.add('hidden');
    document.querySelector("#savedSearchesMenu").classList.add('hidden');
    document.querySelector("#friendsMenu").classList.add('hidden');
    document.querySelector("#settingsMenu").classList.add('hidden');
    document.querySelector("#login").classList.remove('hidden');
    document.querySelector("#userPhoto").classList.add('hidden');
    document.querySelector("#loginStatus").innerHTML = "Not Logged In";
    cancelRecommendationsListener();
    cancelListEntriesListener();
    cancelFriendsListener();
    cancelLabelsListener();
    loggingInView.classList.add('hidden');
    loggingInAnonymousView.classList.add('hidden');
}

export const hideLoginButtons = () => {
    document.querySelector("#inboxDisplay").classList.add('hidden');
    document.querySelector("#login").classList.add('hidden');
}

/**
 * On list screens: the inbox top right for a signed-in user (the filter has
 * moved to the toolbar under the tabs), and no "Log in" button.
 */
export const showInboxButton = () => {
    document.querySelector("#login").classList.add('hidden');
    document.querySelector("#inboxDisplay").classList.toggle('hidden', !swrlUser || swrlUser.isAnonymous);
}

export const showLoginButtons = () => {
    if (!swrlUser || swrlUser.isAnonymous) {
        document.querySelector("#login").classList.remove('hidden');
    } else {
        document.querySelector("#inboxDisplay").classList.remove('hidden');
    }
}