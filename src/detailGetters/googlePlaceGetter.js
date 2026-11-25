import { DetailGetter } from './detailGetter';
import { Details } from '../model/details';
import { placeDetails } from '../model/restaurant';

/**
 * A place to eat from Google, by its place id, through server.js
 * (/api/v1/eat/place): its description, location, cuisine and one photo
 * (with who took it). Asked for when the swrl's page opens; the page saves
 * what comes back.
 */
export class GooglePlaceGetter extends DetailGetter {
    /**
     * @param {string} id
     * @param {AbortSignal} signal
     * @param {number} searchId
     * @return {Promise<{id: number, details: Details}>}
     */
    async get(id, signal, searchId) {
        const response = await fetch(`/api/v1/eat/place?id=${encodeURIComponent(id)}`, { signal });
        if (!response.ok) throw new Error(`Places lookup of ${id} answered HTTP ${response.status}`);
        const details = placeDetails(await response.json());
        // never resolve with placeholder details: the page saves what comes back
        if (!details) throw new Error(`Google has no place ${id}`);
        return { id: searchId, details };
    }
}
