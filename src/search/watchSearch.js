import { zip } from '../utils/zip';
import { FILM, TV } from '../constants/Type';
import { WATCH } from '../constants/Category';
import { Search } from './search';
import { Swrl } from '../model/swrl';
import { Details } from '../model/details';

const imageUrlPrefix = 'https://image.tmdb.org/t/p/w500';

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
        return new Promise(async (resolve, reject) => {
            if (query.match('personID:([0-9]+)')) {
                console.log('Running person search');
                resolve({
                    id: id,
                    results: await personSearch(query, signal)
                });
            } else {
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
            }
        })
    }

    /**
     * @param {string} query
     * @param {AbortSignal} signal
     * @return {Promise<Swrl[]>}
     */
    _filmSearch(query, signal) {
        return new Promise(async (resolve, reject) => {
            const url = `/api/v1/tmdb/search/movie?query=${query}`;
            try {
                const response = await fetch(url, { signal });
                const data = await response.json();
                resolve(data.results.map(tmdbFilmToSwrl));
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
            const url = `/api/v1/tmdb/search/tv?query=${query}`;
            try {
                const response = await fetch(url, { signal });
                const data = await response.json();
                resolve(data.results.map(tmdbTVToSwrl));
            } catch (error) {
                console.log('Fetch failed for TV search: ' + JSON.stringify(error));
                console.error(error);
                resolve([]);
            }
        })
    }
}

/**
* @param {string} releaseDate
*/
const releaseYear = (releaseDate) => {
    if (releaseDate && releaseDate.length >= 4) {
        return releaseDate.substring(0, 4);
    } else {
        return releaseDate;
    }
}

/**
* @param {{ title: string; release_date: string; id: string; poster_path: string; }} result
* @return {Swrl}    
*/
const tmdbFilmToSwrl = (result) => {
    return new Swrl(FILM, WATCH, 'TMDBMOVIE_' + result.id,
        new Details(result.id,
            result.title || 'No Title',
            result.poster_path ? imageUrlPrefix + result.poster_path : 'img/NoPoster.jpg',
            undefined, undefined,
            releaseYear(result.release_date) || 'unknown',
            [],
            [],
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
            undefined
        ));
}

/**
* @param {{ name: any; id: string; poster_path: string; first_air_date: string}} result
* @return {Swrl}
*/
const tmdbTVToSwrl = (result) => {
    return new Swrl(TV, WATCH, 'TMDBTV_' + result.id,
        new Details(result.id,
            result.name || 'No Title',
            result.poster_path ? imageUrlPrefix + result.poster_path : 'img/NoPoster.jpg',
            undefined, undefined, releaseYear(result.first_air_date) || 'unknown',
            [],
            [],
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
            undefined
        ));
}

/**
 * @param {string} encodedQuery
 * @param {AbortSignal} signal
 */
const personSearch = async (encodedQuery, signal) => {
    try {
        const personID = encodedQuery.match('personID:([0-9]+)')[1];
        const url = `/api/v1/tmdb/person/${personID}`;
        const response = await fetch(url, { signal });
        const data = await response.json();
        return zip(data.movie_credits.cast.map(tmdbFilmToSwrl),
            data.tv_credits.cast.map(tmdbTVToSwrl),
            data.movie_credits.crew.filter(crew => crew.job === "Director").map(tmdbFilmToSwrl),
            data.tv_credits.crew.filter(crew => crew.job === "Director").map(tmdbTVToSwrl)
        );
    } catch (err) {
        console.error('Error getting person from: ' + encodedQuery);
        console.error(err);
        return [];
    }
}