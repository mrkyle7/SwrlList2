// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/7.5.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/7.5.0/firebase-messaging.js');
// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyAWAhzSXf6M_dhxNS4SI830qWNy-zF51wk",
  authDomain: "swrl-1118.firebaseapp.com",
  databaseURL: "https://swrl-1118.firebaseio.com",
  projectId: "swrl-1118",
  storageBucket: "swrl-1118.appspot.com",
  messagingSenderId: "443237991407",
  appId: "1:443237991407:web:6d2fabfd1673e2e541ac1a"
});
// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = 'Background Message Title';
  const notificationOptions = {
    body: 'Background Message body.',
    icon: 'img/logo.png'
  };

  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});