import { Constant } from "./Constant";
import { Swrl } from "../model/swrl";
import { isRecommendedToMe } from "../listeners/recommendations";
import { getListEntry } from "../listeners/listEntries";

export class Filter extends Constant {
    /**
     * @param {number} id
     * @param {Function} matcher
     */
    constructor(id, matcher) {
        super(id);
        this.matcher = matcher;
    }

    /**
     * @param {Swrl} swrl
     * @param {string} userId
     * @returns {boolean}
     */
    match(swrl, userId) {
        return this.matcher(swrl, userId)
    }

}

export const RECOMMENDED_FILTER = new Filter(1,
    /**
     * @param {Swrl} swrl
     * @param {string} userId
     */
    (swrl, userId) => {
        return isRecommendedToMe(swrl.swrlID)
    });

/** Started: watching, reading, ... (my own entry). Offered on Your list only. */
export const IN_PROGRESS_FILTER = new Filter(2,
    /**
     * @param {Swrl} swrl
     */
    (swrl) => {
        const entry = getListEntry(swrl.swrlID);
        return entry !== undefined && entry.later && entry.inProgress;
    });

export const filters = Object.freeze([RECOMMENDED_FILTER, IN_PROGRESS_FILTER])

export const filterFromId =
    /**
     * @param {number} id
     * @return {Filter}
     */
    (id) => {
        return filters.find(f => f.id === id);
    }

/**
 * The filters to carry to a list other than Your list: "In progress" only
 * means something on my own list (Discover leaves my swrls out altogether).
 *
 * @param {Filter[]} chosen
 * @return {Filter[]}
 */
export function withoutYourListOnlyFilters(chosen) {
    return chosen.filter(f => f !== IN_PROGRESS_FILTER);
}
