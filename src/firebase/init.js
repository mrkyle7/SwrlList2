import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/messaging';
// Hosts where server.js serves Firebase's sign-in helper pages (/__/auth/*)
// itself, so sign-in happens on our own domain. Each needs
// https://<host>/__/auth/handler among the Google OAuth client's authorised
// redirect URIs. Anywhere else (localhost, the run.app URL) falls back to the
// Firebase-hosted helper.
const OWN_AUTH_DOMAINS = ['swrl-list.com', 'www.swrl-list.com'];

/**
 *  @returns {firebase.app.App}
 */
export default function initialiseFirebase() {
    var config = {
        apiKey: "AIzaSyAWAhzSXf6M_dhxNS4SI830qWNy-zF51wk",
        authDomain: OWN_AUTH_DOMAINS.includes(window.location.hostname)
            ? window.location.hostname
            : "swrl-1118.firebaseapp.com",
        databaseURL: "https://swrl-1118.firebaseio.com",
        projectId: "swrl-1118",
        storageBucket: "swrl-1118.appspot.com",
        messagingSenderId: "443237991407",
        appId: "1:443237991407:web:6d2fabfd1673e2e541ac1a"
    };
    const myFirebase = firebase.initializeApp(config);

    myFirebase.firestore().settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
    myFirebase.firestore().enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('Firestore Persistence enabled');
        })
        .catch(function (err) {
            console.error(err);
            if (err.code == 'failed-precondition') {
                console.error('multiple tabs opened');
            } else if (err.code == 'unimplemented') {
                console.error('browser not supported');
            }
        });

    return myFirebase;
}