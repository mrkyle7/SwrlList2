import { Details } from "../model/details";

export class DetailGetter {
    constructor() { }

    /**
     * @param {string} id
     * @param {AbortSignal} signal
     * @param {number} searchId
     * @return {Promise<{id: number, details: Details}>}
     */
    get(id, signal, searchId) {
        // to be overidden
        return new Promise((resolve, reject) => reject('not overidden'));
    }
}