// Pure helpers, kept apart from index.js so they can be tested without
// Firebase.

const SITE_URL = 'https://swrl-list.com';

/**
 * The push notification sent to everyone a Swrl is recommended to.
 *
 * @param {string[]} tokens device tokens of the receivers
 * @param {{displayName?: string}} recommender
 * @param {{details?: {title?: string}}} swrl
 * @returns {import('firebase-admin/messaging').MulticastMessage}
 */
function recommendationMessage(tokens, recommender, swrl) {
    const who = recommender.displayName || 'Someone';
    const what = (swrl.details && swrl.details.title) || 'something';
    return {
        tokens: tokens,
        notification: {
            title: 'New Swrl Recommendation',
            body: `${who} recommended ${what} to you!`
        },
        webpush: {
            headers: { TTL: String(60 * 60 * 24), Urgency: 'high' },
            notification: { icon: `${SITE_URL}/img/logo.png` },
            fcmOptions: { link: `${SITE_URL}/recommendations` }
        }
    };
}

/**
 * Tokens FCM says will never work again, so they can be deleted.
 *
 * @param {string[]} tokens
 * @param {{success: boolean, error?: {code: string}}[]} responses one per token, in order
 * @returns {string[]}
 */
function deadTokens(tokens, responses) {
    const dead = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];
    return tokens.filter((token, i) => {
        const response = responses[i];
        return response && !response.success && response.error && dead.includes(response.error.code);
    });
}

/**
 * Text of the owner's alert when a user profile is written or deleted, or
 * undefined when no alert should be sent.
 *
 * @param {{uid?: string, displayName?: string} | undefined} before
 * @param {{uid?: string, displayName?: string} | undefined} after
 * @param {string} ownerUid never alert the owner about themselves
 * @returns {string | undefined}
 */
function userActivityText(before, after, ownerUid) {
    const swrler = after || before;
    if (!swrler || swrler.uid === ownerUid) {
        return undefined;
    }
    const name = swrler.displayName || 'An unnamed user';
    return after ? `User ${name} has just logged in.` : `User ${name} was deleted`;
}

module.exports = { recommendationMessage, deadTokens, userActivityText, SITE_URL };
