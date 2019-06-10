import { Collection } from '../constants/Collection';
import { swrlUser } from '../firebase/login';

export default { setUpRecommendationsListener, cancelRecommendationsListener, recommendationsCache };

let currentListener;
export let recommendationsCache = {};
const inboxCount = document.getElementById('inboxCount');
let errorCount = 0;

/**
* @param {firebase.firestore.Firestore} firestore 
*/
export function setUpRecommendationsListener(firestore) {
    currentListener = firestore.collection(Collection.RECOMMENDATIONS)
        .where("to", "array-contains", swrlUser.uid)
        .onSnapshot(querySnapshot => {
            errorCount = 0; //reset the error count to avoid long term errors bubbling
            querySnapshot.docChanges().forEach(docChange => {
                console.log(docChange.type, docChange.doc.id, docChange.doc.data());
                let id = docChange.doc.id;
                let data = docChange.doc.data();
                data.id = id;
                switch (docChange.type) {
                    case 'added':
                        recommendationsCache[id] = data;
                        break;
                    case 'modified':
                        recommendationsCache[id] = data;
                        break;
                    case 'removed':
                        delete recommendationsCache[id];
                        break;
                }
            });
            updateInboxCount();
        }, error => {
            errorCount++;
            console.error('Snapshot listener failed, error count: ' + errorCount);
            console.error(error);
            cancelRecommendationsListener();
            if (errorCount < 5) {
                //avoid an infinite loop by giving up after 5 consecutive errors
                setUpRecommendationsListener(firestore);
            }
        })
}

export function cancelRecommendationsListener() {
    console.log('Cancelling Listener');
    if (currentListener) {
        currentListener(); // 'calling' the onSnaphshot unsubscribes from it. 
    }
    recommendationsCache = {};
    updateInboxCount();
}

const updateInboxCount = () => {
    //Object.values isn't supported in cordova browser
    let recommendations = [];
    Object.keys(recommendationsCache).forEach(i => recommendations.push(recommendationsCache[i]));
    
    let count =
        recommendations
            .filter(r => (!r.read || r.read.indexOf(swrlUser.uid) === -1)
                && (!r.dismissed || r.dismissed.indexOf(swrlUser.uid) === -1))
            .length;
    inboxCount.innerText = count;
}