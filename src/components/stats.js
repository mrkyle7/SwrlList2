export default { addStats };

import { SEARCH } from '../constants/View';
import { Collection } from '../constants/Collection';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';

/**
 * 
 * @param {Function} selector 
 * @param {HTMLElement} div 
 * @param {Swrl} swrl 
 * @param {Constant} view 
 * @param {firebase.firestore.Firestore} firestore 
 */

 
export function addStats(selector, div, swrl, view, firestore) {
    if (view === SEARCH) {
        selector('.swrlListCount').classList.add('hidden');
        selector('.swrlSpinnerListCount').classList.remove('hidden');
        selector('.swrlRecommendedCount').classList.add('hidden');
        selector('.swrlSpinnerRecommendedCount').classList.remove('hidden');
        selector('.swrlLoveCount').classList.add('hidden');
        selector('.swrlSpinnerLoveCount').classList.remove('hidden');
        var docRef = firestore.collection(Collection.SWRLS).doc(swrl.swrlID);
        docRef.get()
            .then((doc) => {
                if (doc.exists) {
                    var data = doc.data();
                    var laterCount = data.later ? data.later.length : 0;
                    var doneCount = data.done ? data.done.length : 0;
                    var recommendedCount = data.recommendations ? data.recommendations.length : 0;
                    var lovedCount = data.loved ? data.loved.length : 0;
                    if (div) {
                        updateStats(laterCount + doneCount, recommendedCount, lovedCount);
                    }
                } else if (div) {
                    updateStats(0, 0, 0);
                }
            })
            .catch((err) => {
                console.error('Error when getting swrl stats');
                console.error(err);
                if (div) {
                    updateStats(0, 0, 0);
                }
            })

    } else {
        var laterCount = swrl.later ? swrl.later.length : 0;
        var doneCount = swrl.done ? swrl.done.length : 0;
        var recommendedCount = swrl.recommendations ? swrl.recommendations.length : 0;
        var lovedCount = swrl.loved ? swrl.loved.length : 0;

        selector('.swrlListCount').innerText = laterCount + doneCount;
        selector('.swrlRecommendedCount').innerText = recommendedCount;
        selector('.swrlLoveCount').innerText = lovedCount;
    }

    /**
     * @param {number} listCount
     * @param {number} recommendedCount
     * @param {number} loveCount
     */
    function updateStats(listCount, recommendedCount, loveCount) {
        div.querySelector('.swrlListCount').classList.remove('hidden');
        div.querySelector('.swrlSpinnerListCount').classList.add('hidden');

        div.querySelector('.swrlRecommendedCount').classList.remove('hidden');
        div.querySelector('.swrlSpinnerRecommendedCount').classList.add('hidden');

        div.querySelector('.swrlLoveCount').classList.remove('hidden');
        div.querySelector('.swrlSpinnerLoveCount').classList.add('hidden');

        /** @type {HTMLSpanElement} */
        const listCountElement = div.querySelector('.swrlListCount');
        listCountElement.innerText = listCount.toString();

        /** @type {HTMLSpanElement} */
        const recommendedCountElement = div.querySelector('.swrlRecommendedCount');
        recommendedCountElement.innerText = recommendedCount.toString();
        
        /** @type {HTMLSpanElement} */
        const loveCountElement = div.querySelector('.swrlLoveCount');
        loveCountElement.innerText = loveCount.toString();
    }
}