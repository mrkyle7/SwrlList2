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
        // a new one reaches Firestore.
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
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
