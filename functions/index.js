const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

const fetch = require('node-fetch');

exports.userActivityNotification = functions.firestore
    .document('swrlers/{swrlerID}')
    .onWrite((change, context) => {
        const swrler = change.after.exists ? change.after.data() : null;
        const swrlerBefore = change.before.exists ? change.before.data() : null;
        let message;
        if (swrler) {
            message = 'User ' + swrler.displayName + ' has just logged in.';
        } else {
            message = 'User ' + swrlerBefore.displayName + ' was deleted';
        }
        const token = functions.config().pushover.token;
        const user = functions.config().pushover.user;
        const url = 'https://api.pushover.net/1/messages.json';
        if (swrler.uid === 'hm7BIObShKVqU58e9O4Rj1JOK8k2') {
            console.log('Do not send for Kyle');
            return false;
        }
        return fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({
                token: token,
                user: user,
                message: message
            })
        })
    })

exports.recommendationNotification = functions.firestore
    .document('recommendations/{recommendationID}')
    .onCreate(async (snapshot) => {
        const recommendation = snapshot.data();
        const swrlRef = await db.collection('swrls').doc(recommendation.swrlID).get();
        const recommenderRef = await db.collection('swrlers').doc(recommendation.from).get();
        if (swrlRef.exists && recommenderRef.exists) {
            const swrl = swrlRef.data();
            const recommender = recommenderRef.data();
            const body = `${recommender.displayName} recommended ${swrl.details.title} to you!`;
            const message = {
                notification: {
                    title: 'New Swrl Recommendation',
                    body: body
                }
            };
            const options = {
                priority: "high",
                timeToLive: 60 * 60 * 24
            };
            admin.messaging().sendToDevice('fgNM9PVaj9I:APA91bGZIResUsQMJGgMEtsXF1KIOaLpUYnyzxgOCEX4NgIy2aR1jaqA_E5Fl0skKbbB0agVxTYfNnk2kuEFCORYUBB1ybWJYoE4zP4nK3s7GB2Q4abB5f3RtvMJ9phryiLnVDzHP7kk',
                message, options)
                .then((response) => {
                    // Response is a message ID string.
                    console.log('Successfully sent message:', response);
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });;
        }
    })