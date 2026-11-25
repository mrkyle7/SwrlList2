import { Search } from './search';
import { Swrl } from '../model/swrl';
import { RESTAURANT } from '../constants/Type';
import { EAT } from '../constants/Category';
import { placesFromSearch, PLACE_ID_PREFIX } from '../model/restaurant';
import { eatSearchScope } from '../components/eatWhere';
import { getJson } from './settle';

/**
 * Places to eat from Google, through server.js (/api/v1/eat/search, the
 * Places API's Text Search): by name or cuisine, near me or in a town or
 * city (components/eatWhere.js). Cards show a stock photo for the cuisine;
 * the swrl page asks for the description and a Google photo.
 */
export class EatSearch extends Search {
    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: Swrl[], failed?: string[]}>}
     */
    async run(query, signal, id) {
        try {
            const scope = await eatSearchScope();
            const params = new URLSearchParams({ q: query, ...scope.params });
            const answer = await getJson(`/api/v1/eat/search?${params}`, signal);
            const places = placesFromSearch(answer);
            return { id, results: places.map(details => new Swrl(RESTAURANT, EAT, PLACE_ID_PREFIX + details.id, details)) };
        } catch (error) {
            if (signal && signal.aborted) return { id, results: [] };
            console.error(error);
            return { id, results: [], failed: ['places to eat'] };
        }
    }
}
