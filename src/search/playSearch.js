import { zip } from '../utils/zip';
import { settle } from './settle';
import { Type, BOARDGAME, VIDEOGAME } from '../constants/Type';
import { PLAY } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { fetchGeekItems, fetchGeekXml, detailsFromGeekItem } from '../detailGetters/geekDetailGetter';

export class PlaySearch extends Search {

    constructor() {
        super();
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @param {number} id
     * @return {Promise<{id: number, results: Swrl[], failed?: string[]}>}     
     */
    async run(query, signal, id) {
        const encodedQuery = encodeURIComponent(query);
        const { results, failed } = await settle([
            { name: 'board games', run: () => boardgameSearch(encodedQuery, signal) },
            { name: 'video games', run: () => videoGameSearch(encodedQuery, signal) }
        ], signal);
        return { id: id, results: zip(...results), failed };
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
    const url = `/api/v1/geek/search?type=${type.geekType}&query=${query}`;
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
