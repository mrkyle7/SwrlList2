import { Constant } from "./Constant";
import { Swrl } from "../model/swrl";

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
        return swrl.isRecommended.some(id => id === userId)
    });

export const filters = Object.freeze([RECOMMENDED_FILTER])

export const filterFromId =
    /**
     * @param {number} id
     * @return {Filter}
     */
    (id) => {
        return filters.find(f => f.id === id);
    }