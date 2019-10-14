import { Swrl } from "../model/swrl";

export class Search {
    constructor() { }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: Swrl[]}>}
     */
    run(query, signal, id) {
        // to be overidden
        return null;
    }
}