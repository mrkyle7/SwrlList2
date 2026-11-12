import { Collection } from "../constants/Collection";
import { swrlUser } from "./login";
import firebase from 'firebase/compat/app';

const VAPID_KEY = 'BCbFUNHtZXs8mHOyZkkBL8rtiLIf0E4ND4WtZMp5eMxj-KFTS2D16bfjEj45ARiwt5hVecwtxGNQNAWs0U8rq2c';

/** @type {string} */
export let deviceToken;

/**
 * @param {firebase.app.App} myfirebase
 * @param {firebase.firestore.Firestore} firestore
 */
export const initMessaging = (myfirebase, firestore) => {
    if (!firebase.messaging.isSupported() || !('Notification' in window)) {
        console.log('Push messaging is not supported in this browser');
        return;
    }
    const messaging = myfirebase.messaging();
    Notification.requestPermission().then((permission) => {
        if (permission !== 'granted') {
            console.log('Unable to get permission to notify.');
            return;
        }
        // The token is refreshed by the SDK; asking again on each start is how
        // a new one reaches Firestore.
        return messaging.getToken({ vapidKey: VAPID_KEY }).then((currentToken) => {
            if (currentToken) {
                deviceToken = currentToken;
                updateDeviceToken(firestore);
            } else {
                console.log('No messaging token available.');
            }
        });
    }).catch((err) => {
        console.log('An error occurred while retrieving the messaging token. ', err);
    });
    messaging.onMessage((payload) => {
        console.log('Message received while the app is open. ', payload);
    });
}

/**
 * @param {firebase.firestore.Firestore} firestore
 */
export const updateDeviceToken = (firestore) => {
    if (swrlUser !== undefined && !swrlUser.isAnonymous && deviceToken !== undefined) {
        firestore.collection(Collection.MESSAGINGTOKENS).doc(deviceToken).set({
            uid: swrlUser.uid,
            token: deviceToken
        })
    }
}
