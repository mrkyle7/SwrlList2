import { zip } from '../utils/zip';
import { Type, BOARDGAME, VIDEOGAME } from '../constants/Type';
import { PLAY } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { fetchGeekItems, fetchGeekXml, detailsFromGeekItem } from '../detailGetters/geekDetailGetter';
import { apiBase } from '../constants/Site';

export class PlaySearch extends Search {

    constructor() {
        super();
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: Swrl[]}>}     
     */
    run(query, signal, id) {
        return new Promise(function (resolve, reject) {

            const encodedQuery = encodeURIComponent(query);

            const searches = [boardgameSearch(encodedQuery, signal), videoGameSearch(encodedQuery, signal)];
            Promise.all(searches.map(search => search.then(
                results => ({ results: results, error: undefined }),
                error => ({ results: [], error: error }))))
                .then(function ([boardGames, videoGames]) {
                    // One type failing should not hide the other's results,
                    // but if both fail the user should see an error.
                    if (signal && signal.aborted) {
                        // Superseded by a newer search; the caller ignores stale ids.
                        resolve({ id: id, results: [] });
                    } else if (boardGames.error && videoGames.error) {
                        console.error('Error getting play results');
                        console.error(boardGames.error);
                        reject(boardGames.error);
                    } else {
                        resolve({ id: id, results: zip(boardGames.results, videoGames.results) });
                    }
                })
        });
    }
}

/**
 * @param {string} query
 * @param {AbortSignal} signal
 * @return {Promise<Swrl[]>}
 */
function boardgameSearch(query, signal) {
    return geekSearch(BOARDGAME, query, signal);
}

/**
 * @param {string} query
 * @param {AbortSignal} signal
 * @return {Promise<Swrl[]>} 
 */
function videoGameSearch(query, signal) {
    return geekSearch(VIDEOGAME, query, signal);
}

/**
 * @param {Type} type
 * @param {string} query
 * @param {AbortSignal} signal
 * @return {Promise<Swrl[]>} 
 */
async function geekSearch(type, query, signal) {
    const url = `${apiBase()}/api/v1/geek/search?type=${type.geekType}&query=${query}`;
    const xmlResults = await fetchGeekXml(url, signal);
    const ids = Array.from(xmlResults.getElementsByTagName('item'))
        .slice(0, 20)
        .map(item => item.getAttribute('id'));
    // One batched details request instead of one request per result.
    const items = await fetchGeekItems(ids, signal);
    /** @type {Object<string, Element>} */
    const itemsById = {};
    items.forEach(item => itemsById[item.getAttribute('id')] = item);
    // Keep the search's relevance order; skip anything BGG returned no details for.
    return ids
        .filter(id => itemsById[id] !== undefined)
        .map(id => new Swrl(type, PLAY, 'GEEK' + type.geekType + '_' + id,
            detailsFromGeekItem(itemsById[id], type.geekType)));
}
