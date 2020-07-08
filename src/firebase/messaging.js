import { Collection } from "../constants/Collection";
import { swrlUser } from "./login";
const firebase = require('firebase/app');

/** @type {string} */
export let deviceToken;

/**
 * @param {firebase.app.App} myfirebase
 * @param {firebase.firestore.Firestore} firestore
 * 
 */
export const initMessaging = (myfirebase, firestore) => {
    console.log('initialising messaging');
    // @ts-ignore
    console.log(`platform: ${device.platform}`);
    // @ts-ignore
    if (device.platform === 'browser' && firebase.messaging.isSupported()) {
        const messaging = myfirebase.messaging();
        messaging.usePublicVapidKey('BCbFUNHtZXs8mHOyZkkBL8rtiLIf0E4ND4WtZMp5eMxj-KFTS2D16bfjEj45ARiwt5hVecwtxGNQNAWs0U8rq2c');
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                messaging.getToken().then((currentToken) => {
                    if (currentToken) {
                        console.log('Token:');
                        console.log(currentToken);
                        deviceToken = currentToken;
                        updateDeviceToken(firestore);
                    } else {
                        // Show permission request.
                        console.log('No Instance ID token available. Request permission to generate one.');
                    }
                }).catch((err) => {
                    console.log('An error occurred while retrieving token. ', err);
                });
            } else {
                console.log('Unable to get permission to notify.');
            }
        });
        messaging.onMessage((payload) => {
            console.log('Message received (service worker). ', payload);
            // ...  
        });
        messaging.onTokenRefresh(() => {
            messaging.getToken()
                .then((currentToken) => {
                    if (currentToken) {
                        console.log('Token:');
                        console.log(currentToken);
                        deviceToken = currentToken;
                        updateDeviceToken(firestore);
                    } else {
                        // Show permission request.
                        console.log('No Instance ID token available. Request permission to generate one.');
                    }
                }).catch((err) => {
                    console.log('An error occurred while retrieving token. ', err);
                })
        })
    }
}

/**
 * 
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