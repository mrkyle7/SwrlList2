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
 * The push notification sent to the receiver of a friend request.
 *
 * @param {string[]} tokens device tokens of the receiver
 * @param {{displayName?: string}} requester
 * @returns {import('firebase-admin/messaging').MulticastMessage}
 */
function friendRequestMessage(tokens, requester) {
    const who = requester.displayName || 'Someone';
    return {
        tokens: tokens,
        notification: {
            title: 'New Friend Request',
            body: `${who} wants to be your friend on Swrl List!`
        },
        webpush: {
            headers: { TTL: String(60 * 60 * 24), Urgency: 'high' },
            notification: { icon: `${SITE_URL}/img/logo.png` },
            fcmOptions: { link: `${SITE_URL}/friends` }
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
 * Whether two Firestore timestamps (or Dates, or millisecond numbers) are the
 * same moment. Two missing values are the same; one missing is a difference.
 *
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
function sameTime(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) {
        return (a === undefined || a === null) && (b === undefined || b === null);
    }
    if (typeof a.isEqual === 'function') {
        try {
            return a.isEqual(b);
        } catch (e) {
            // fall through to comparing milliseconds
        }
    }
    return millis(a) === millis(b);
}

/**
 * @param {any} value a Timestamp, Date or number
 * @returns {number}
 */
function millis(value) {
    if (typeof value === 'number') return value;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (value instanceof Date) return value.getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
    return NaN;
}

/**
 * Text of the owner's alert when a user profile is created, logged into or
 * deleted, or undefined when no alert should be sent. A write that leaves
 * `lastLoginTime` as it was (for example a change of default visibility) is
 * not a login.
 *
 * @param {{uid?: string, displayName?: string, lastLoginTime?: any} | undefined} before
 * @param {{uid?: string, displayName?: string, lastLoginTime?: any} | undefined} after
 * @param {string} ownerUid never alert the owner about themselves
 * @returns {string | undefined}
 */
function userActivityText(before, after, ownerUid) {
    const swrler = after || before;
    if (!swrler || swrler.uid === ownerUid) {
        return undefined;
    }
    const name = swrler.displayName || 'An unnamed user';
    if (!after) {
        return `User ${name} was deleted`;
    }
    if (before && sameTime(before.lastLoginTime, after.lastLoginTime)) {
        return undefined;
    }
    return `User ${name} has just logged in.`;
}

module.exports = { recommendationMessage, friendRequestMessage, deadTokens, userActivityText, SITE_URL };
