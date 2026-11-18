import { zip } from '../utils/zip';
import { ALBUM, PODCAST } from '../constants/Type';
import { LISTEN } from '../constants/Category';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';
import { Search } from './search';
import { Link } from '../model/link';
import { getJson, settle } from './settle';

export class ListenSearch extends Search {

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
            { name: 'albums', run: () => this.albumSearch(encodedQuery, signal) },
            { name: 'podcasts', run: () => this.podcastSearch(encodedQuery, signal) }
        ], signal);
        return { id: id, results: zip(...results), failed };
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @return {Promise<Swrl[]>}
     */
    albumSearch(query, signal) {
        // through our server: some phones and networks block Apple's API when the browser calls it
        return getJson('/api/v1/itunes/search?term=' + query + '&media=music&entity=album', signal)
            .then(data => (data.results || []).map(/**
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
                                    'Apple Music', undefined)],
                                undefined,
                                undefined,
                                [],
                                [],
                                undefined,
                                [],
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
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @return {Promise<Swrl[]>}
     */
    podcastSearch(query, signal) {
        return getJson('/api/v1/itunes/search?term=' + query + '&media=podcast&entity=podcast', signal)
            .then(data => (data.results || []).map(/**
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
                                    'Apple Podcasts', undefined)],
                                undefined,
                                undefined,
                                [],
                                [],
                                undefined,
                                [],
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
    }
}

/**
     * @param {{ artworkUrl100: string; }} result
     */
const getLargeImage = (result) => {
    const smallerImage = result.artworkUrl100;
    return smallerImage ? smallerImage.replace('100x100', '600x600') : undefined;
}