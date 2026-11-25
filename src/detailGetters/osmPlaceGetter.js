import { DetailGetter } from './detailGetter';
import { Details } from '../model/details';
import { placeDetails, photoFromTags } from '../model/restaurant';

/**
 * A place to eat from OpenStreetMap, by the id the app keeps ("n123"),
 * through server.js (/api/v1/eat/place). When the entry has no photo of its
 * own but lists a website, the picture that website shares (its og:image,
 * found by /api/v1/pageimage) replaces the stock photo.
 */
export class OsmPlaceGetter extends DetailGetter {
    /**
     * @param {string} id
     * @param {AbortSignal} signal
     * @param {number} searchId
     * @return {Promise<{id: number, details: Details}>}
     */
    async get(id, signal, searchId) {
        const response = await fetch(`/api/v1/eat/place?id=${encodeURIComponent(id)}`, { signal });
        if (!response.ok) throw new Error(`Overpass lookup of ${id} answered HTTP ${response.status}`);
        const answer = await response.json();
        const element = (answer.elements || [])[0];
        const details = element ? placeDetails(element) : undefined;
        // never resolve with placeholder details: the page saves what comes back
        if (!details) throw new Error(`OpenStreetMap has no place to eat ${id}`);
        if (!photoFromTags(element.tags || {}) && details.place && details.place.website) {
            const picture = await websitePicture(details.place.website, signal);
            if (picture) details.imageUrl = picture;
        }
        return { id: searchId, details };
    }
}

/**
 * @param {string} website
 * @param {AbortSignal} signal
 * @return {Promise<string | undefined>}
 */
async function websitePicture(website, signal) {
    try {
        const response = await fetch(`/api/v1/pageimage?url=${encodeURIComponent(website)}`, { signal });
        if (!response.ok) return undefined;
        const { imageUrl } = await response.json();
        return typeof imageUrl === 'string' && /^https?:\/\//.test(imageUrl) ? imageUrl : undefined;
    } catch (error) {
        return undefined;
    }
}
