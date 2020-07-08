import { Collection } from '../constants/Collection';
import { swrlUser, showLoginButtons } from '../firebase/login';
import { Recommendation } from '../model/recommendation';

export let recommendationsInboxCache = {};
/** @type Object */
export let recommendationsSentCache = {};
export default { setUpRecommendationsListener, cancelRecommendationsListener, recommendationsCache: recommendationsInboxCache };

let currentInboxListener;
let currentSentListener;
const inboxCount = document.getElementById('inboxCount');
let errorCountInbox = 0;
let errorCountSent = 0;
export let inboxReady = false;

/**
* @param {firebase.firestore.Firestore} firestore 
*/
export function setUpRecommendationsListener(firestore) {
    currentInboxListener = firestore.collection(Collection.RECOMMENDATIONS)
        .where("to", "array-contains", swrlUser.uid)
        .onSnapshot(querySnapshot => {
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
                        resolve();
                    } catch (error) {
                        console.error("Couldn't process recommendation from inbox listener: ", docChange.doc.id, docChange.doc.data());
                        console.error(error);
                        resolve();
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
    currentSentListener = firestore.collection(Collection.RECOMMENDATIONS)
        .where("from", "==", swrlUser.uid)
        .onSnapshot(async querySnapshot => {
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
    updateInboxCount();
}

const updateInboxCount = () => {
    //Object.values isn't supported in cordova browser
    let recommendations = [];
    Object.keys(recommendationsInboxCache).forEach(i => recommendations.push(recommendationsInboxCache[i]));

    let count =
        recommendations
            .filter(r => (!r.read || r.read.indexOf(swrlUser.uid) === -1)
                && (!r.dismissed || r.dismissed.indexOf(swrlUser.uid) === -1))
            .length;
    inboxCount.innerText = count.toString();
}