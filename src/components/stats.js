export default { addStats };

import { SEARCH } from '../constants/View';
import { Collection } from '../constants/Collection';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';

/**
 * 
 * @param {HTMLElement} div 
 * @param {Swrl} swrl 
 */


export function addStats(div, swrl) {

    const laterCount = swrl.later ? swrl.later.length : 0;
    const doneCount = swrl.done ? swrl.done.length : 0;
    const recommendedCount = swrl.recommendations ? swrl.recommendations.length : 0;
    const lovedCount = swrl.loved ? swrl.loved.length : 0;

    if (div) {
        updateStats(laterCount + doneCount, recommendedCount, lovedCount);
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