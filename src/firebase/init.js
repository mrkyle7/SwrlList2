var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/firestore");
require("firebase/messaging");

export default function initialiseFirebase() {
    var config = {
        apiKey: "AIzaSyAWAhzSXf6M_dhxNS4SI830qWNy-zF51wk",
        authDomain: "swrl-1118.firebaseapp.com",
        databaseURL: "https://swrl-1118.firebaseio.com",
        projectId: "swrl-1118",
        storageBucket: "swrl-1118.appspot.com",
        messagingSenderId: "443237991407"
    };
    firebase.initializeApp(config);

    firebase.firestore().enablePersistence()
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
    return firebase;
}