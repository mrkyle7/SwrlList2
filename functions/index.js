const functions = require('firebase-functions');
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