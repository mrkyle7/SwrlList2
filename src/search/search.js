import { Swrl } from "../model/swrl";

export class Search {
    constructor() { }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @param {(batch: Swrl[], first: boolean) => void} [onBatch] searches of several
     *   sources (Search everything) may hand results over as they arrive
     * @return {Promise<{id: number, results: Swrl[], failed?: string[]}>} failed: sources that could not be reached, named for people
     */
    run(query, signal, id, onBatch) {
        // to be overidden
        return null;
    }
}