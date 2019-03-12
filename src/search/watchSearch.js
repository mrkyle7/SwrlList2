export default { watchSearch }

import { zip } from '../utils/zip';
import { Type } from '../constants/Type';

var tmdbAPIKey = 'c3356e66739e40233c7870d42b30bc34';
var imageUrlPrefix = 'https://image.tmdb.org/t/p/original';

export function watchSearch(query, signal, id) {
    return new Promise(function (resolve, reject) {
        var encodedQuery = encodeURIComponent(query);
        var searches = [filmSearch(encodedQuery, signal), TVSearch(encodedQuery, signal)];
        Promise.all(searches)
            .then(function ([filmResults, TVResults]) {
                resolve({ id: id, results: zip(filmResults, TVResults) });
            })
            .catch(function (error) {
                console.error('Error getting watch results: ' + JSON.stringify(error))
                console.error(error);
                resolve({ id: id, results: [] })
            })
    })
}

function filmSearch(query, signal) {
    return new Promise(async function (resolve, reject) {
        var url = 'https://api.themoviedb.org/3/search/movie?api_key=' + tmdbAPIKey + '&query=' + query;
        try {
            var response = await fetch(url, { signal });
            var data = await response.json();
            resolve(data.results.map(function (result) {
                return {
                    title: result.title,
                    type: Type.FILM,
                    releaseYear: releaseYear(result.release_date),
                    id: result.id,
                    swrlID: 'TMDBMOVIE_' + result.id,
                    imageUrl: result.poster_path ? imageUrlPrefix + result.poster_path : '/img/NoPoster.jpg'
                }
            }));
        } catch (error) {
            console.log('Fetch failed for film search: ' + JSON.stringify(error));
            console.error(error);
            resolve([]);
        }
    })
}

function TVSearch(query, signal) {
    return new Promise(async function (resolve, reject) {
        var url = 'https://api.themoviedb.org/3/search/tv?api_key=' + tmdbAPIKey + '&query=' + query;
        try {
            var response = await fetch(url, { signal });
            var data = await response.json();
            resolve(data.results.map(function (result) {
                return {
                    title: result.name,
                    type: Type.TV,
                    releaseYear: releaseYear(result.release_date),
                    id: result.id,
                    swrlID: 'TMDBTV_' + result.id,
                    imageUrl: result.poster_path ? imageUrlPrefix + result.poster_path : '/img/NoPoster.jpg'
                }
            }));
        } catch (error) {
            console.log('Fetch failed for TV search: ' + JSON.stringify(error));
            console.error(error);
            resolve([]);
        }
    })
}

function releaseYear(releaseDate) {
    if (releaseDate && releaseDate.length >= 4) {
        return releaseDate.substring(0, 4);
    } else {
        return releaseDate;
    }
}