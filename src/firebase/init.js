const firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");
require("firebase/messaging");

/**
 *  @returns {firebase.app.App}
 */
export default function initialiseFirebase() {
    var config = {
        apiKey: "AIzaSyAWAhzSXf6M_dhxNS4SI830qWNy-zF51wk",
        authDomain: "swrl-1118.firebaseapp.com",
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
    myFirebase.firestore().enablePersistence({ experimentalTabSynchronization: true })
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