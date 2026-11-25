import { doc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { Collection } from "../constants/Collection";
import { swrlUser } from "./login";

const VAPID_KEY = 'BCbFUNHtZXs8mHOyZkkBL8rtiLIf0E4ND4WtZMp5eMxj-KFTS2D16bfjEj45ARiwt5hVecwtxGNQNAWs0U8rq2c';

/** @type {string} */
export let deviceToken;

/**
 * @param {import('firebase/app').FirebaseApp} firebaseApp
 * @param {import('firebase/firestore').Firestore} firestore
 */
export const initMessaging = async (firebaseApp, firestore) => {
    try {
        if (!('Notification' in window) || !(await isSupported())) {
            console.log('Push messaging is not supported in this browser');
            return;
        }
        const messaging = getMessaging(firebaseApp);
        onMessage(messaging, (payload) => {
            console.log('Message received while the app is open. ', payload);
        });
        if (await Notification.requestPermission() !== 'granted') {
            console.log('Unable to get permission to notify.');
            return;
        }
        // The token is refreshed by the SDK; asking again on each start is how
        // a new one reaches Firestore. With the app's own worker (www/sw.js loads
        // the push handler), so a tapped notification opens the installed app.
        const serviceWorkerRegistration = await appWorker();
        const currentToken = await getToken(messaging, serviceWorkerRegistration
            ? { vapidKey: VAPID_KEY, serviceWorkerRegistration }
            : { vapidKey: VAPID_KEY });
        if (currentToken) {
            deviceToken = currentToken;
            updateDeviceToken(firestore);
        } else {
            console.log('No messaging token available.');
        }
    } catch (err) {
        console.log('An error occurred while setting up push messaging. ', err);
    }
}

/** Where Firebase registered its own push worker before 3.30.0. */
const OLD_PUSH_SCOPE = '/firebase-cloud-messaging-push-scope';

/**
 * The app's service worker (www/sw.js, scope /), once it is active, and the
 * old separate push worker gone: its notifications opened in the browser,
 * and with both, a message would show twice. Undefined where there is no app
 * worker (an http address other than localhost), so the SDK registers its own.
 *
 * @return {Promise<ServiceWorkerRegistration | undefined>}
 */
async function appWorker() {
    if (!('serviceWorker' in navigator)) return undefined;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
        .filter(registration => new URL(registration.scope).pathname.startsWith(OLD_PUSH_SCOPE))
        .map(registration => registration.unregister()));
    const app = registrations.find(registration => new URL(registration.scope).pathname === '/');
    if (!app) return undefined;
    return navigator.serviceWorker.ready;
}

/**
 * @param {import('firebase/firestore').Firestore} firestore
 */
export const updateDeviceToken = (firestore) => {
    if (swrlUser !== undefined && !swrlUser.isAnonymous && deviceToken !== undefined) {
        setDoc(doc(firestore, Collection.MESSAGINGTOKENS, deviceToken), {
            uid: swrlUser.uid,
            token: deviceToken
        });
    }
}
