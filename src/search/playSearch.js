import { zip } from '../utils/zip';
import { Type, BOARDGAME, VIDEOGAME } from '../constants/Type';
import { PLAY } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';
import { Link } from '../model/link';
import { GeekDetailGetter } from '../detailGetters/geekDetailGetter';

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
            Promise.all(searches)
                .then(function ([boardGameResults, videoGameResults]) {
                    resolve({ id: id, results: zip(boardGameResults, videoGameResults) });
                })
                .catch(function (error) {
                    console.error('Error getting other results: ' + JSON.stringify(error))
                    console.error(error);
                    resolve({ id: id, results: [] })
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
function geekSearch(type, query, signal) {
    return new Promise(async function (resolve, reject) {
        const url = "https://api.geekdo.com/xmlapi2/search?type=" + type.geekType + "&query=" + query;
        const response = await fetch(url, { signal });
        const xmlData = await response.text();
        const parser = new DOMParser();
        const xmlResults = parser.parseFromString(xmlData, 'application/xml');
        const items = xmlResults.getElementsByTagName('item');
        const maxResults = items.length < 20 ? items.length : 20;
        const results = [];
        const detailGetter = new GeekDetailGetter(type.geekType);
        for (let index = 0; index < maxResults; index++) {
            const item = items[index];
            const id = item.getAttribute('id');
            const getterResponse = await detailGetter.get(id, signal, 0);
            const details = getterResponse.details;
            
            results.push(
                new Swrl(type, PLAY, 'GEEK' + type.geekType + '_' + id, details)
            )
        }
        resolve(results);
    });
}