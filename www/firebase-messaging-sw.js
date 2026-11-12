// Push notifications while the app is closed. Registered by the Firebase
// Messaging SDK under its own scope; the app shell is handled by sw.js.
//
// Keep this version in step with the "firebase" package in package.json.
importScripts('https://www.gstatic.com/firebasejs/13.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.3.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAWAhzSXf6M_dhxNS4SI830qWNy-zF51wk",
  authDomain: "swrl-1118.firebaseapp.com",
  projectId: "swrl-1118",
  storageBucket: "swrl-1118.appspot.com",
  messagingSenderId: "443237991407",
  appId: "1:443237991407:web:6d2fabfd1673e2e541ac1a"
});

// Messages sent with a "notification" payload (see functions/index.js) are
// displayed by the SDK itself; creating the instance is all that is needed.
firebase.messaging();
