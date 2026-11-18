export default { addStats };



import { SEARCH } from '../constants/View';
import { Collection } from '../constants/Collection';
import { Constant } from '../constants/Constant';
import { Swrl } from '../model/swrl';
import { statsSentence } from '../model/listView';

/**
 * The numbers shown on a swrl. The counts come from the shared doc (kept by a
 * Cloud Function; Swrl.fromFirestore already falls back to the legacy array
 * lengths on documents the migration has not reached).
 *
 * @param {Swrl} swrl
 * @return {{listCount: number, recommendedCount: number, lovedCount: number}}
 */
export function swrlStats(swrl) {
    return {
        listCount: Math.max(0, swrl.laterCount + swrl.doneCount),
        recommendedCount: swrl.recommendations ? swrl.recommendations.length : 0,
        lovedCount: Math.max(0, swrl.lovedCount)
    };
}

/**
 * 
 * @param {HTMLElement} div 
 * @param {Swrl} swrl 
 */


export function addStats(div, swrl) {

    if (div) {
        const stats = swrlStats(swrl);
        updateStats(stats.listCount, stats.recommendedCount, stats.lovedCount);
        // the counts in words, for the detailed card
        const words = div.querySelector('.swrlStatsText');
        if (words) {
            words.textContent = statsSentence(stats);
            words.classList.toggle('hidden', !words.textContent);
        }
    }


    /**
     * @param {number} listCount
     * @param {number} recommendedCount
     * @param {number} loveCount
     */
    function updateStats(listCount, recommendedCount, loveCount) {
        // A zero says nothing, so a stat only shows once it has a number.
        [['.swrlStatList', listCount], ['.swrlStatRecommended', recommendedCount], ['.swrlStatLoved', loveCount]]
            .forEach(([selector, count]) => {
                const stat = div.querySelector(String(selector));
                if (stat) stat.classList.toggle('hidden', count === 0);
            });
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