import { zip } from '../utils/zip';
import { ALBUM, PODCAST } from '../constants/Type';
import { LISTEN } from '../constants/Category';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';
import { Search } from './search';
import { Link } from '../model/link';

export class ListenSearch extends Search {

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
            const searches = [this.albumSearch(encodedQuery, signal), this.podcastSearch(encodedQuery, signal)];
            Promise.all(searches)
                .then(function ([albumResults, podcastResults]) {
                    resolve({ id: id, results: zip(albumResults, podcastResults) });
                })
                .catch(function (error) {
                    console.error('Error getting list results: ' + JSON.stringify(error))
                    console.error(error);
                    resolve({ id: id, results: [] })
                })
        }.bind(this))
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @return {Promise<Swrl[]>}
     */
    albumSearch(query, signal) {
        return new Promise(async function (resolve, reject) {
            const url = 'https://itunes.apple.com/search?term=' + query + '&media=music&entity=album';
            try {
                const response = await fetch(url, { signal });
                const data = await response.json();
                resolve(data.results.map(/**
                 * @param {{releaseDate: string; primaryGenreName: string; artworkUrl100: string; collectionName?: any; artistName?: any; collectionId?: any; }} result
                 * @return {Swrl}
                 */
                    result => {
                        return new Swrl(ALBUM, LISTEN, 'ITUNESALBUM_' + result.collectionId,
                            new Details(result.collectionId,
                                result.collectionName || 'No title',
                                getLargeImage(result) || 'img/NoPoster.jpg',
                                result.artistName || 'Unknown',
                                undefined,
                                result.releaseDate ? result.releaseDate.substring(0, 4) : undefined,
                                [result.primaryGenreName],
                                [new Link(`https://music.apple.com/gb/album/${result.collectionId}`,
                                    'iTunes', 'img/itunes.svg')],
                                undefined,
                                undefined,
                                [],
                                undefined,
                                [],
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                [],
                                [],
                                [],
                                [],
                                undefined,
                                undefined,
                                undefined));
                    }));
            } catch (error) {
                console.log('Fetch failed for Album search: ' + JSON.stringify(error));
                console.error(error);
                resolve([]);
            }
        }.bind(this))
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @return {Promise<Swrl[]>}
     */
    podcastSearch(query, signal) {
        return new Promise(async function (resolve, reject) {
            const url = 'https://itunes.apple.com/search?term=' + query + '&media=podcast&entity=podcast';
            try {
                const response = await fetch(url, { signal });
                const data = await response.json();
                resolve(data.results.map(/**
                 * @param {any} result
                 * @return {Swrl}
                 */
                    function (result) {
                        return new Swrl(PODCAST, LISTEN, 'ITUNESPODCAST_' + result.collectionId,
                            new Details(result.collectionId,
                                result.trackName || 'No title',
                                getLargeImage(result) || 'img/NoPoster.jpg',
                                undefined,
                                result.artistName,
                                result.releaseDate ? result.releaseDate.substring(0, 4) : undefined,
                                result.genres,
                                [new Link(`https://podcasts.apple.com/gb/podcast/${result.collectionId}`,
                                    'iTunes', 'img/itunes.svg')],
                                undefined,
                                undefined,
                                [],
                                undefined,
                                [],
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                [],
                                [],
                                [],
                                [],
                                undefined,
                                undefined,
                                undefined),
                            undefined);
                    }));
            } catch (error) {
                console.log('Fetch failed for Podcast search: ' + JSON.stringify(error));
                console.error(error);
                resolve([]);
            }
        }.bind(this))
    }
}

/**
     * @param {{ artworkUrl100: string; }} result
     */
const getLargeImage = (result) => {
    const smallerImage = result.artworkUrl100;
    return smallerImage.replace('100x100', '600x600');
}