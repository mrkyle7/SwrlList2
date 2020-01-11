import { DetailGetter } from "./detailGetter";
import { Details } from "../model/details";
import { Link } from "../model/link";
import { Rating } from "../model/rating";


const tmdbAPIKey = 'c3356e66739e40233c7870d42b30bc34';
const imageUrlPrefix = 'https://image.tmdb.org/t/p/original';

export class TmdbFilmDetailGetter extends DetailGetter {
    constructor() {
        super();
    }

    /**
     * @param {string} id
     * @param {AbortSignal} signal
     * @param {number} searchId
     * @return {Promise<{id: number, details: Details}>}
     */
    get(id, signal, searchId) {
        // to be overidden
        return new Promise(async (resolve, reject) => {
            const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbAPIKey}`;
            try {
                const response = await fetch(url, { signal });
                const data = await response.json();
                const omdbUrl = `https://www.omdbapi.com/?apikey=d33a4ae1&i=${data.imdb_id}`;
                let omdbData = undefined;
                try {
                    const omdbresponse = await fetch(omdbUrl, { signal });
                    omdbData = await omdbresponse.json();
                } catch (err) {
                    console.error('Could not get OMDB data');
                    console.error(err);
                }

                let overview = data.overview;

                if (omdbData !== undefined && omdbData.Plot !== undefined && omdbData.Plot !== null
                    && omdbData.Plot !== '' && omdbData.Plot !== 'N/A') {
                    overview = omdbData.Plot;
                }
                let actors = [];
                if (omdbData !== undefined && omdbData.Actors !== undefined && omdbData.Actors !== null) {
                    actors = omdbData.Actors.split(', ');
                }

                let ratings = [];

                const logos = {
                    "Internet Movie Database": 'img/imdb-logo.png',
                    "Rotten Tomatoes": 'img/rottentomatoes_logo_40.png',
                    "Metacritic": 'img/metacritic.png'
                };

                if (omdbData !== undefined && omdbData.Ratings !== undefined && omdbData.Ratings !== null) {
                    omdbData.Ratings.forEach(
                        /**
                         * @param {{ Source: string; Value: string; }} omdbRating
                        */
                        omdbRating => {
                            const rating = new Rating(omdbRating.Source, omdbRating.Value, logos[omdbRating.Source]);
                            ratings.push(rating);
                        })
                }

                let director = undefined;
                if (omdbData !== undefined && omdbData.Director !== undefined && omdbData.Director !== null) {
                    director = omdbData.Director;
                }

                const links = [
                    new Link(`https://www.themoviedb.org/movie/${data.id}`, 'The Movie Database', 'img/tmdb_logo.png'),
                    new Link(data.homepage, 'Film Home Page', undefined)
                ];

                if (data.imdb_id) {
                    const imdbLink = new Link(`https://www.imdb.com/title/${data.imdb_id}/`, 'IMDb', 'img/imdb-logo.png');
                    links.push(imdbLink);
                }
                resolve(
                    {
                        id: searchId,
                        details: new Details(id,
                            data.title,
                            data.poster_path ? imageUrlPrefix + data.poster_path : 'img/NoPoster.jpg',
                            undefined,
                            undefined,
                            releaseYear(data.release_date),
                            data.genres.map(g => g.name),
                            links,
                            data.tagline,
                            overview,
                            actors,
                            director,
                            ratings,
                            data.runtime ? data.runtime + ' mins' : undefined,
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
                        )
                    }
                )
            } catch (err) {
                console.error('Error getting details from TMDB for movie ID: ' + id);
                console.error(err);
                reject(err);
            }
        });
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