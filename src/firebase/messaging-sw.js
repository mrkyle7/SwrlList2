// Push notifications while the app is closed. Built by webpack into
// /firebase-messaging-sw.js, which the Firebase Messaging SDK registers under
// its own scope; the app shell is handled by www/sw.js.
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';
import { firebaseConfig } from './config';

// Messages sent with a "notification" payload (see functions/index.js) are
// displayed by the SDK itself; creating the instance is all that is needed.
getMessaging(initializeApp(firebaseConfig));
