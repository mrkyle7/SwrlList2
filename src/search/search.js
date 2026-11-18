import { Swrl } from "../model/swrl";

export class Search {
    constructor() { }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: Swrl[], failed?: string[]}>} failed: sources that could not be reached, named for people
     */
    run(query, signal, id) {
        // to be overidden
        return null;
    }
}