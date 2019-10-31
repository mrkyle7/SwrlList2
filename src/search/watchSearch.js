import { zip } from '../utils/zip';
import { FILM, TV } from '../constants/Type';
import { WATCH } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';

const tmdbAPIKey = 'c3356e66739e40233c7870d42b30bc34';
const imageUrlPrefix = 'https://image.tmdb.org/t/p/original';

export class WatchSearch extends Search {

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
            const searches = [this._filmSearch(encodedQuery, signal), this._TVSearch(encodedQuery, signal)];
            Promise.all(searches)
                .then(function ([filmResults, TVResults]) {
                    resolve({ id: id, results: zip(filmResults, TVResults) });
                })
                .catch(function (error) {
                    console.error('Error getting watch results: ' + JSON.stringify(error))
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
    _filmSearch(query, signal) {
        return new Promise(async (resolve, reject) => {
            const url = 'https://api.themoviedb.org/3/search/movie?api_key=' + tmdbAPIKey + '&query=' + query;
            try {
                const response = await fetch(url, { signal });
                const data = await response.json();
                resolve(data.results.map(/**
                 * @param {{ title: string; release_date: string; id: string; poster_path: string; }} result
                 * @return {Swrl}
                 */
                    (result) => {
                        return new Swrl(FILM, WATCH, 'TMDBMOVIE_' + result.id,
                            new Details(result.id,
                                result.title || 'No Title',
                                result.poster_path ? imageUrlPrefix + result.poster_path : '/img/NoPoster.jpg',
                                undefined, undefined,
                                this._releaseYear(result.release_date) || 'unknown'
                            ));
                    }));
            } catch (error) {
                console.log('Fetch failed for film search: ' + JSON.stringify(error));
                console.error(error);
                resolve([]);
            }
        })
    }

    /**
     * @param {string} query
     * @param {any} signal
     */
    _TVSearch(query, signal) {
        return new Promise(async (resolve, reject) => {
            const url = 'https://api.themoviedb.org/3/search/tv?api_key=' + tmdbAPIKey + '&query=' + query;
            try {
                const response = await fetch(url, { signal });
                const data = await response.json();
                resolve(data.results.map(/**
                 * @param {{ name: any; id: string; poster_path: string; }} result
                 * @return {Swrl}
                 */
                    (result) => {
                        return new Swrl(TV, WATCH, 'TMDBTV_' + result.id,
                            new Details(result.id,
                                result.name || 'No Title',
                                result.poster_path ? imageUrlPrefix + result.poster_path : '/img/NoPoster.jpg',
                                undefined, undefined, undefined
                            ));
                    }));
            } catch (error) {
                console.log('Fetch failed for TV search: ' + JSON.stringify(error));
                console.error(error);
                resolve([]);
            }
        })
    }

    /**
     * @param {string} releaseDate
     */
    _releaseYear(releaseDate) {
        if (releaseDate && releaseDate.length >= 4) {
            return releaseDate.substring(0, 4);
        } else {
            return releaseDate;
        }
    }
}