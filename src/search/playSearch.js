import { zip } from '../utils/zip';
import { Type, BOARDGAME, VIDEOGAME } from '../constants/Type';
import { PLAY } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';

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

            var encodedQuery = encodeURIComponent(query);

            var searches = [boardgameSearch(encodedQuery, signal), videoGameSearch(encodedQuery, signal)];
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
        var url = "https://api.geekdo.com/xmlapi2/search?type=" + type.geekType + "&query=" + query;
        var response = await fetch(url, { signal });
        var xmlData = await response.text();
        var parser = new DOMParser();
        var xmlResults = parser.parseFromString(xmlData, 'application/xml');
        var items = xmlResults.getElementsByTagName('item');
        var maxResults = items.length < 20 ? items.length : 20;
        var results = [];
        for (var index = 0; index < maxResults; index++) {
            var item = items[index];
            var title = item.getElementsByTagName('name')[0].getAttribute('value');
            var id = item.getAttribute('id');
            var imageUrl = await getImageUrl(id, signal);
            results.push(
                new Swrl(type, PLAY, 'GEEK' + type.geekType + '_' + id,
                    new Details(id, title, imageUrl || '/img/NoPoster.jpg',
                        undefined, undefined, undefined,
                        [],
                        [],
                        undefined,
                        undefined,
                        [],
                        undefined,
                        [],
                        undefined))
            )
        }
        resolve(results);
    });
}

/**
 * @param {string} id
 * @param {AbortSignal} signal
 */
async function getImageUrl(id, signal) {
    var url = 'https://api.geekdo.com/xmlapi2/thing?id=' + id;
    var response = await fetch(url, { signal });
    var xmlData = await response.text();
    var parser = new DOMParser();
    var xmlResult = parser.parseFromString(xmlData, 'application/xml');
    var items = xmlResult.getElementsByTagName('item');
    if (!items || items.length == 0) {
        console.log('ID from geek returned no items!');
        return undefined;
    }
    var images = items[0].getElementsByTagName('image');
    if (images && images.length > 0) {
        return images[0].textContent;
    } else {
        console.log('No images for ' + id);
        return undefined;
    }
}