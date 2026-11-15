// Cloud Functions for Swrl List. Deployed by .github/workflows/deploy.yml.
//
// These are 1st gen functions on purpose: a 2nd gen Firestore trigger has to
// be deployed to a region matching the Firestore database's location, while
// 1st gen works wherever the database is.
const functions = require('firebase-functions/v1');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { recommendationMessage, friendRequestMessage, deadTokens, userActivityText } = require('./messages');
const { countDeltas, justAccepted, friendDocsFor } = require('./listEntries');

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

        const tokens = await tokensFor(receivers);
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

        await sendAndCleanUp(recommendationMessage(tokens, recommenderDoc.data(), swrlDoc.data()));
    });

/**
 * Sends a push notification to the receiver of a new friend request.
 */
exports.friendRequestNotification = functions.firestore
    .document('friendRequests/{requestID}')
    .onCreate(async (snapshot) => {
        const request = snapshot.data();
        const tokens = await tokensFor([request.to]);
        if (tokens.length === 0) {
            console.log('no tokens to send to');
            return;
        }
        const requesterDoc = await db.collection('swrlers').doc(request.from).get();
        if (!requesterDoc.exists) {
            console.log('no details for message');
            return;
        }
        await sendAndCleanUp(friendRequestMessage(tokens, requesterDoc.data()));
    });

/**
 * Keeps the shared counts on swrls/{swrlID} in step with the users' list
 * entries. Clients can never write the count fields.
 */
exports.listEntryCounts = functions.firestore
    .document('swrlers/{uid}/listEntries/{swrlID}')
    .onWrite(async (change, context) => {
        const deltas = countDeltas(
            change.before.exists ? change.before.data() : undefined,
            change.after.exists ? change.after.data() : undefined);
        const update = {};
        for (const [field, delta] of Object.entries(deltas)) {
            update[field] = FieldValue.increment(delta);
        }
        if (Object.keys(update).length === 0) {
            return;
        }
        await db.collection('swrls').doc(context.params.swrlID).set(update, { merge: true });
    });

/**
 * When a friend request is accepted, makes the two users friends and removes
 * the request. Friend docs can only be written from here.
 */
exports.friendRequestAccepted = functions.firestore
    .document('friendRequests/{requestID}')
    .onUpdate(async (change) => {
        const before = change.before.data();
        const after = change.after.data();
        if (!justAccepted(before, after)) {
            return;
        }
        const batch = db.batch();
        for (const friend of friendDocsFor(after)) {
            batch.set(db.doc(friend.path), { uid: friend.uid, since: FieldValue.serverTimestamp() });
        }
        batch.delete(change.after.ref);
        await batch.commit();
    });

/**
 * When one side unfriends, removes the other side's friend doc too.
 * Idempotent: deleting the mirror triggers this once more, which finds
 * nothing left to delete.
 */
exports.friendRemoved = functions.firestore
    .document('swrlers/{uid}/friends/{friendUid}')
    .onDelete(async (snapshot, context) => {
        const { uid, friendUid } = context.params;
        const mirror = db.doc(`swrlers/${friendUid}/friends/${uid}`);
        if ((await mirror.get()).exists) {
            await mirror.delete();
        }
    });

/**
 * Device tokens of the given users.
 *
 * @param {string[]} uids
 * @returns {Promise<string[]>}
 */
async function tokensFor(uids) {
    const tokenSnapshots = await Promise.all(uids.map(
        uid => db.collection('messagingtokens').where('uid', '==', uid).get()));
    const tokens = [];
    tokenSnapshots.forEach(found => found.forEach(doc => tokens.push(doc.data().token)));
    return tokens;
}

/**
 * Sends a multicast message and deletes the tokens FCM reports as dead.
 *
 * @param {import('firebase-admin/messaging').MulticastMessage} message
 */
async function sendAndCleanUp(message) {
    const tokens = message.tokens;
    const result = await getMessaging().sendEachForMulticast(message);
    console.log(`sent ${result.successCount} of ${tokens.length} notifications`);

    // A browser that has unsubscribed never comes back under the same
    // token, so stop sending to it.
    await Promise.all(deadTokens(tokens, result.responses).map(
        token => db.collection('messagingtokens').doc(token).delete()));
}
