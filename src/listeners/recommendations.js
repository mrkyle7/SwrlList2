import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Collection, unreadRepliesPath } from '../constants/Collection';
import { swrlUser, showLoginButtons } from '../firebase/login';
import { Recommendation, inboxHasSwrl, badgeCount } from '../model/recommendation';

export let recommendationsInboxCache = {};
/** @type Object */
export let recommendationsSentCache = {};
export default { setUpRecommendationsListener, cancelRecommendationsListener, recommendationsCache: recommendationsInboxCache };

let currentInboxListener;
let currentSentListener;
let currentUnreadRepliesListener;
/** ids of the recommendations with a reply I have not read (sent or received) */
let unreadReplyIDs = new Set();
const inboxCount = document.getElementById('inboxCount');
let errorCountInbox = 0;
let errorCountSent = 0;
export let inboxReady = false;

/**
* @param {import('firebase/firestore').Firestore} firestore 
*/
export function setUpRecommendationsListener(firestore) {
    currentInboxListener = onSnapshot(query(collection(firestore, Collection.RECOMMENDATIONS),
        where("to", "array-contains", swrlUser.uid)),
        querySnapshot => {
            errorCountInbox = 0; //reset the error count to avoid long term errors bubbling
            /**  @type {Promise[]} */
            const inboxUpdates = [];
            querySnapshot.docChanges().forEach(docChange => {
                inboxUpdates.push(new Promise((resolve, reject) => {
                    // console.log(docChange.type, docChange.doc.id, docChange.doc.data());
                    let recommendation;
                    try {
                        const recommendation = Recommendation.fromFirestore(docChange.doc, firestore)
                        switch (docChange.type) {
                            case 'added':
                                recommendationsInboxCache[recommendation.id] = recommendation;
                                break;
                            case 'modified':
                                recommendationsInboxCache[recommendation.id] = recommendation;
                                break;
                            case 'removed':
                                delete recommendationsInboxCache[recommendation.id];
                                break;
                        }
                        resolve(undefined);
                    } catch (error) {
                        console.error("Couldn't process recommendation from inbox listener: ", docChange.doc.id, docChange.doc.data());
                        console.error(error);
                        resolve(undefined);
                        return;
                    }
                }))
            });
            Promise.all(inboxUpdates)
                .then(() => {
                    updateInboxCount();
                    inboxReady = true;
                })
        }, error => {
            errorCountInbox++;
            console.error('Snapshot listener failed, error count: ' + errorCountInbox);
            console.error(error);
            cancelRecommendationsListener();
            if (errorCountInbox < 5) {
                //avoid an infinite loop by giving up after 5 consecutive errors
                setUpRecommendationsListener(firestore);
            } else {
                console.log('Giving up getting inbox ready')
                inboxReady = true;
            }
        })
    currentUnreadRepliesListener = onSnapshot(collection(firestore, unreadRepliesPath(swrlUser.uid).join('/')),
        querySnapshot => {
            unreadReplyIDs = new Set(querySnapshot.docs.map(docSnapshot => docSnapshot.id));
            updateInboxCount();
        }, error => {
            // the badge just won't count replies; the rest of the app still works
            console.error('Unread replies listener failed', error);
        });
    currentSentListener = onSnapshot(query(collection(firestore, Collection.RECOMMENDATIONS),
        where("from", "==", swrlUser.uid)),
        async querySnapshot => {
            errorCountSent = 0; //reset the error count to avoid long term errors bubbling
            /**  @type {Promise[]} */
            querySnapshot.docChanges().forEach(docChange => {
                // console.log(docChange.type, docChange.doc.id, docChange.doc.data());
                let recommendation;
                try {
                    const recommendation = Recommendation.fromFirestore(docChange.doc, firestore)
                    switch (docChange.type) {
                        case 'added':
                            recommendationsSentCache[recommendation.id] = recommendation;
                            break;
                        case 'modified':
                            recommendationsSentCache[recommendation.id] = recommendation;
                            break;
                        case 'removed':
                            delete recommendationsSentCache[recommendation.id];
                            break;
                    }
                } catch (error) {
                    console.error("Couldn't process recommendation from sent listener: ", docChange.doc.id, docChange.doc.data());
                    console.error(error);
                    return;
                }
            });
            updateInboxCount();
        }, error => {
            errorCountSent++;
            console.error('Snapshot listener failed, error count: ' + errorCountSent);
            console.error(error);
            cancelRecommendationsListener();
            if (errorCountSent < 5) {
                //avoid an infinite loop by giving up after 5 consecutive errors
                setUpRecommendationsListener(firestore);
            }
        })
}

/**
 * Whether a swrl was recommended to me: an inbox recommendation has its swrlID.
 *
 * @param {string} swrlID
 * @return {boolean}
 */
export function isRecommendedToMe(swrlID) {
    return inboxHasSwrl(recommendationsInboxCache, swrlID);
}

export function cancelRecommendationsListener() {
    console.log('Cancelling Listener');
    if (currentInboxListener) {
        currentInboxListener(); // 'calling' the onSnaphshot unsubscribes from it. 
    }
    recommendationsInboxCache = {};
    if (currentSentListener) {
        currentSentListener(); // 'calling' the onSnaphshot unsubscribes from it. 
    }
    recommendationsSentCache = {};
    if (currentUnreadRepliesListener) {
        currentUnreadRepliesListener();
    }
    unreadReplyIDs = new Set();
    updateInboxCount();
}

const updateInboxCount = () => {
    inboxCount.innerText = swrlUser
        ? badgeCount(recommendationsInboxCache, recommendationsSentCache, swrlUser.uid, unreadReplyIDs).toString()
        : '0';
}

/**
 * Whether a recommendation (sent or received) has a reply I haven't read.
 *
 * @param {string} recommendationID
 * @return {boolean}
 */
export function hasUnreadReply(recommendationID) {
    return unreadReplyIDs.has(recommendationID);
}

/**
 * The recommendations I have been sent for one swrl, newest first: the "why
 * is this on my list" shown on its card.
 *
 * @param {string} swrlID
 * @return {Recommendation[]}
 */
export function inboxRecommendationsFor(swrlID) {
    return Object.values(recommendationsInboxCache)
        .filter(recommendation => recommendation.swrlID === swrlID)
        .sort((a, b) => (b.created ? b.created.getTime() : 0) - (a.created ? a.created.getTime() : 0));
}
