// Cloud Functions for Swrl List. Deployed by .github/workflows/deploy.yml.
//
// These are 1st gen functions on purpose: a 2nd gen Firestore trigger has to
// be deployed to a region matching the Firestore database's location, while
// 1st gen works wherever the database is.
const functions = require('firebase-functions/v1');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { recommendationMessage, deadTokens, userActivityText } = require('./messages');

initializeApp();
const db = getFirestore();

// Secret Manager secrets, filled from GitHub Actions secrets of the same name
// by the deploy workflow. "not-set" is terraform's placeholder.
const PUSHOVER_TOKEN = defineSecret('PUSHOVER_TOKEN');
const PUSHOVER_USER = defineSecret('PUSHOVER_USER');

const OWNER_UID = 'hm7BIObShKVqU58e9O4Rj1JOK8k2';

/**
 * Tells the site's owner (via Pushover) when a user logs in or is deleted.
 */
exports.userActivityNotification = functions
    .runWith({ secrets: [PUSHOVER_TOKEN, PUSHOVER_USER] })
    .firestore.document('swrlers/{swrlerID}')
    .onWrite(async (change) => {
        const text = userActivityText(
            change.before.exists ? change.before.data() : undefined,
            change.after.exists ? change.after.data() : undefined,
            OWNER_UID);
        if (!text) {
            return;
        }
        const token = PUSHOVER_TOKEN.value();
        const user = PUSHOVER_USER.value();
        if (!token || !user || token === 'not-set' || user === 'not-set') {
            console.log('Pushover is not configured; skipping alert');
            return;
        }
        const response = await fetch('https://api.pushover.net/1/messages.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, user: user, message: text })
        });
        if (!response.ok) {
            console.error(`Pushover responded ${response.status}`);
        }
    });

/**
 * Sends a push notification to everyone a Swrl was just recommended to.
 */
exports.recommendationNotification = functions.firestore
    .document('recommendations/{recommendationID}')
    .onCreate(async (snapshot) => {
        const recommendation = snapshot.data();
        /** @type {string[]} */
        const receivers = recommendation.to || [];

        const tokenSnapshots = await Promise.all(receivers.map(
            uid => db.collection('messagingtokens').where('uid', '==', uid).get()));
        const tokens = [];
        tokenSnapshots.forEach(found => found.forEach(doc => tokens.push(doc.data().token)));
        if (tokens.length === 0) {
            console.log('no tokens to send to');
            return;
        }

        const [swrlDoc, recommenderDoc] = await Promise.all([
            db.collection('swrls').doc(recommendation.swrlID).get(),
            db.collection('swrlers').doc(recommendation.from).get()
        ]);
        if (!swrlDoc.exists || !recommenderDoc.exists) {
            console.log('no details for message');
            return;
        }

        const result = await getMessaging().sendEachForMulticast(
            recommendationMessage(tokens, recommenderDoc.data(), swrlDoc.data()));
        console.log(`sent ${result.successCount} of ${tokens.length} notifications`);

        // A browser that has unsubscribed never comes back under the same
        // token, so stop sending to it.
        await Promise.all(deadTokens(tokens, result.responses).map(
            token => db.collection('messagingtokens').doc(token).delete()));
    });
